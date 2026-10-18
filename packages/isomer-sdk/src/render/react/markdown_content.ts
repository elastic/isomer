/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builder content as React elements, read from the blocks the Markdown and
// Slack surfaces read. Unstyled: a pack's stylesheet owns the look.

import { createElement, Fragment, type ReactNode } from 'react';
import type {
  FootnoteDefinition,
  List,
  ListItem,
  Nodes,
  PhrasingContent,
  RootContent,
  Table,
} from 'mdast';

import type { MarkdownContent } from '../../define/markdown_content';
import {
  BLOCKED_HREF,
  sanitizeParsedAssetUrl,
  sanitizeParsedNavigationHref,
} from '../../validate/url';
import { resolvedMarkdownBlocks } from '../markdown/blocks';

const HEADINGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

const footnoteLabel = ({
  identifier,
  label,
}: Pick<FootnoteDefinition, 'identifier' | 'label'>): string =>
  `[^${label ?? identifier}]`;

const plainText = (node: Nodes): string => {
  if ('value' in node) {
    return node.value;
  }
  if (node.type === 'image') {
    return node.alt ?? '';
  }
  if (node.type === 'footnoteReference') {
    return footnoteLabel(node);
  }
  return 'children' in node ? node.children.map(plainText).join('') : '';
};

const keyed = (nodes: readonly ReactNode[]): ReactNode[] =>
  nodes.map((node, index) => createElement(Fragment, { key: index }, node));

const inlines = (nodes: readonly PhrasingContent[]): ReactNode[] =>
  keyed(nodes.map(inline));

const inline = (node: PhrasingContent): ReactNode => {
  switch (node.type) {
    case 'strong':
      return createElement('strong', null, ...inlines(node.children));
    case 'emphasis':
      return createElement('em', null, ...inlines(node.children));
    case 'delete':
      return createElement('del', null, ...inlines(node.children));
    case 'inlineCode':
      return createElement('code', null, node.value);
    case 'break':
      return createElement('br');
    case 'link':
      return createElement(
        'a',
        {
          href: sanitizeParsedNavigationHref(node.url) ?? BLOCKED_HREF,
          ...(node.title ? { title: node.title } : {}),
        },
        ...inlines(node.children)
      );
    case 'image': {
      const src = sanitizeParsedAssetUrl(node.url);
      return src === null
        ? (node.alt ?? '')
        : createElement('img', {
            src,
            alt: node.alt ?? '',
            ...(node.title ? { title: node.title } : {}),
          });
    }
    default:
      return plainText(node);
  }
};

const paragraphCount = (item: ListItem): number =>
  item.children.filter(({ type }) => type === 'paragraph').length;

// One spread item, or one with two paragraphs, makes the whole list loose.
const items = (list: List): ReactNode[] => {
  const tight = !list.children.some(
    (item) => item.spread === true || paragraphCount(item) > 1
  );
  return list.children.map((item, index) => listItem(item, index, tight));
};

const listItem = (item: ListItem, key: number, tight: boolean): ReactNode => {
  const checkbox =
    typeof item.checked === 'boolean'
      ? [
          createElement('input', {
            key: 'checkbox',
            type: 'checkbox',
            checked: item.checked,
            disabled: true,
            readOnly: true,
          }),
          ' ',
        ]
      : [];
  const children = item.children.flatMap((child): ReactNode[] =>
    child.type === 'paragraph' && tight
      ? inlines(child.children)
      : [block(child)]
  );
  return createElement('li', { key }, ...checkbox, ...keyed(children));
};

const tableRows = (table: Table): ReactNode => {
  const [header, ...body] = table.children;
  const cells = (row: Table['children'][number], tag: 'th' | 'td'): ReactNode =>
    createElement(
      'tr',
      null,
      ...row.children.map((cell, index) => {
        const align = table.align?.[index];
        return createElement(
          tag,
          {
            key: index,
            ...(align ? { style: { textAlign: align } } : {}),
          },
          ...inlines(cell.children)
        );
      })
    );
  return createElement(
    Fragment,
    null,
    header
      ? createElement('thead', { key: 'head' }, cells(header, 'th'))
      : null,
    body.length > 0
      ? createElement(
          'tbody',
          { key: 'body' },
          ...body.map((row, index) =>
            createElement(Fragment, { key: index }, cells(row, 'td'))
          )
        )
      : null
  );
};

const blocks = (nodes: readonly RootContent[]): ReactNode[] =>
  keyed(nodes.map(block));

const block = (node: RootContent): ReactNode => {
  switch (node.type) {
    case 'paragraph':
      return createElement('p', null, ...inlines(node.children));
    case 'heading':
      return createElement(
        HEADINGS[node.depth - 1]!,
        null,
        ...inlines(node.children)
      );
    case 'blockquote':
      return createElement('blockquote', null, ...blocks(node.children));
    case 'list':
      return createElement(
        node.ordered ? 'ol' : 'ul',
        node.ordered && node.start != null && node.start !== 1
          ? { start: node.start }
          : null,
        ...items(node)
      );
    case 'code':
      return createElement(
        'pre',
        null,
        createElement(
          'code',
          node.lang ? { className: `language-${node.lang}` } : null,
          node.value
        )
      );
    case 'table':
      return createElement('table', null, tableRows(node));
    case 'thematicBreak':
      return createElement('hr');
    case 'html':
      return createElement('p', null, node.value);
    case 'footnoteDefinition': {
      const [first, ...rest] = node.children;
      return createElement(
        Fragment,
        null,
        createElement(
          'p',
          null,
          `${footnoteLabel(node)}: `,
          ...(first?.type === 'paragraph' ? inlines(first.children) : [])
        ),
        ...blocks(first?.type === 'paragraph' ? rest : node.children)
      );
    }
    default:
      return null;
  }
};

/**
 * Builder content as React elements: paragraphs, headings, lists, quotes, code, tables, and thematic breaks, with inline marks, links, and images. Source from `md.authored` is parsed as GFM, once, as the Markdown and Slack surfaces read it.
 *
 * Links and images follow `md`'s URL policy: a blocked link keeps its label on {@link BLOCKED_HREF}, and a blocked image degrades to its alt text.
 */
export const renderMarkdownContent = (content: MarkdownContent): ReactNode =>
  createElement(
    Fragment,
    null,
    ...blocks(resolvedMarkdownBlocks(content) as RootContent[])
  );
