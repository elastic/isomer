/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List, Nodes, PhrasingContent, RootContent, Table } from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';
import { BLOCKED_HREF, sanitizeAssetUrl } from '../../validate/url';
import { serializeMarkdown, VERBATIM } from '../markdown/builder';

import { SLACK_LIMITS, type SlackBlock } from './blocks';
import {
  clampSlackText,
  code,
  codeBlock,
  escapeMrkdwn,
  gfmToSlackBlocks,
  gfmToSlackMrkdwn,
  link,
  slackPreformattedBlock,
  slackTableBlock,
} from './format';

const LOOKALIKES: Readonly<Record<string, string | undefined>> = {
  '*': '∗',
  _: 'ˍ',
  '~': '∼',
  '`': 'ˋ',
};
const SPACE_RE = /\s/u;
const BOUNDARY_RE = /[\s\p{P}\p{S}]/u;

const isSpace = (char: string | undefined): boolean =>
  char === undefined || SPACE_RE.test(char);

const isBoundary = (char: string | undefined): boolean =>
  char === undefined || BOUNDARY_RE.test(char);

const canOpen = (text: string, index: number): boolean =>
  isBoundary(text[index - 1]) && !isSpace(text[index + 1]);

const canClose = (text: string, index: number): boolean =>
  !isSpace(text[index - 1]) && isBoundary(text[index + 1]);

// Slack pairs `*`, `_`, `~` and backticks in text itself, so a literal one that
// would open a pair, or end a span drawn with it, prints as a lookalike.
// `within` holds the delimiters of the enclosing spans.
const neutralize = (text: string, within: string): string => {
  const lastCloser = new Map<string, number>();
  for (let index = 0; index < text.length; index += 1) {
    if (LOOKALIKES[text[index]!] && canClose(text, index)) {
      lastCloser.set(text[index]!, index);
    }
  }
  let out = '';
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    const lookalike = LOOKALIKES[char];
    const pairs = within.includes(char)
      ? canOpen(text, index) || canClose(text, index)
      : canOpen(text, index) && (lastCloser.get(char) ?? -1) > index;
    out += lookalike !== undefined && pairs ? lookalike : char;
  }
  return out;
};

const literal = (text: string, within: string): string =>
  escapeMrkdwn(neutralize(text, within));

const plainText = (node: Nodes): string =>
  'value' in node
    ? node.value
    : node.type === 'image'
      ? (node.alt ?? '')
      : 'children' in node
        ? node.children.map(plainText).join('')
        : '';

// Slack cannot nest a style in itself, so an inner span of the enclosing
// style prints its content alone.
const span = (
  delimiter: '*' | '_',
  children: readonly PhrasingContent[],
  within: string
): string => {
  const inner = inlines(children, `${within}${delimiter}`);
  return within.includes(delimiter) || inner === ''
    ? inner
    : `${delimiter}${inner}${delimiter}`;
};

const inline = (node: PhrasingContent, within: string): string => {
  switch (node.type) {
    case 'strong':
      return span('*', node.children, within);
    case 'emphasis':
      return span('_', node.children, within);
    case 'inlineCode':
      return code(node.value);
    // A link the builder blocked keeps its label as text.
    case 'link':
      return node.url === BLOCKED_HREF
        ? escapeMrkdwn(plainText(node))
        : link(node.url, plainText(node));
    case 'image': {
      const url = sanitizeAssetUrl(node.url);
      return url === null
        ? escapeMrkdwn(node.alt ?? '')
        : link(url, node.alt ?? '');
    }
    case 'break':
      return '\n';
    default:
      return literal(plainText(node), within);
  }
};

const inlines = (nodes: readonly PhrasingContent[], within = ''): string =>
  nodes.map((node) => inline(node, within)).join('');

// With `listItemIndent: 'one'`, as the serializer prints it.
const list = ({ children, ordered, start }: List): string =>
  children
    .map((item, index) => {
      const marker = ordered ? `${(start ?? 1) + index}. ` : '- ';
      const body = item.children.map(mrkdwn).filter(Boolean).join('\n');
      return `${marker}${body.replaceAll('\n', `\n${' '.repeat(marker.length)}`)}`;
    })
    .join('\n');

const mrkdwn = (node: RootContent): string => {
  if ((node.type as string) === VERBATIM) {
    return gfmToSlackMrkdwn((node as { value: string }).value);
  }
  switch (node.type) {
    case 'paragraph':
      return inlines(node.children);
    case 'heading': {
      const text = inlines(node.children, '*');
      return text === '' ? '' : `*${text}*`;
    }
    case 'list':
      return list(node);
    case 'blockquote':
      return node.children.map(mrkdwn).join('\n').replace(/^/gm, '> ');
    case 'code':
      return codeBlock(node.value);
    case 'table':
      return gfmToSlackMrkdwn(
        serializeMarkdown(node as unknown as MarkdownContent)
      );
    default:
      return literal(plainText(node), '');
  }
};

const table = ({ align, children }: Table): SlackBlock => {
  const rows = children.map((row) =>
    row.children.map((cell) => plainText(cell).trim())
  );
  return slackTableBlock(
    rows,
    (rows[0] ?? []).map((_, index) => align?.[index] ?? 'left')
  );
};

const nodesOf = (content: MarkdownContent): RootContent[] =>
  Array.isArray(content)
    ? content.flatMap(nodesOf)
    : [content as unknown as RootContent];

/**
 * Translates builder content to Block Kit as {@link gfmToSlackBlocks} does its
 * serialization, but from the tree, so no escape or delimiter is re-read.
 * Content printed as written still goes through {@link gfmToSlackBlocks}.
 */
export const markdownContentToSlackBlocks = (
  content: MarkdownContent
): SlackBlock[] => {
  const blocks: SlackBlock[] = [];
  let prose: string[] = [];
  const flush = (): void => {
    const text = prose.filter((chunk) => chunk.trim() !== '').join('\n\n');
    prose = [];
    if (text !== '') {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: clampSlackText(text, SLACK_LIMITS.sectionTextChars),
        },
      });
    }
  };
  const push = (block: SlackBlock): void => {
    flush();
    blocks.push(block);
  };
  for (const node of nodesOf(content)) {
    if ((node.type as string) === VERBATIM) {
      for (const block of gfmToSlackBlocks((node as { value: string }).value)) {
        if (block.type === 'section' && block.text) {
          prose.push(block.text.text);
        } else {
          push(block);
        }
      }
    } else if (node.type === 'code') {
      push(slackPreformattedBlock(node.value));
    } else if (node.type === 'table') {
      push(table(node));
    } else {
      prose.push(mrkdwn(node));
    }
  }
  flush();
  return blocks;
};
