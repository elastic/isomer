/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Builder content is mdast under a brand. Every mdast type stays inside this
// module, so no emitted declaration names one.

import type {
  Blockquote,
  Definition,
  Image,
  Link,
  ListItem,
  PhrasingContent,
  RootContent,
  TableRow,
} from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import {
  defaultHandlers,
  type Handle,
  type Options,
  toMarkdown,
} from 'mdast-util-to-markdown';

import {
  type MarkdownBlock,
  type MarkdownContent,
  markdownContent,
  type MarkdownInline,
  type MarkdownInlineInput,
} from '../../define/markdown_content';
import {
  BLOCKED_HREF,
  sanitizeAssetUrl,
  sanitizeNavigationHref,
} from '../../validate/url';

import { sanitizeMarkdownSource } from './format';

const LINE_TERMINATORS_RE = /\r\n|[\n\r\u2028\u2029]/g;
// A fence-info string only allows word-ish tokens; anything else would
// terminate the fence early or inject markdown.
const FENCE_INFO_RE = /^[\w+#.-]+$/;
/** The node type of Markdown printed as written. */
export const VERBATIM_TYPE = 'isomerVerbatim';

const oneLine = (value: string): string =>
  value.replace(LINE_TERMINATORS_RE, ' ');

const inline = (node: PhrasingContent): MarkdownInline =>
  Object.assign(node, { [markdownContent]: 'inline' as const });

const block = (node: RootContent): MarkdownBlock =>
  Object.assign(node, { [markdownContent]: 'block' as const });

const isContentList = (
  content: MarkdownInline | MarkdownContent
): content is readonly MarkdownContent[] => Array.isArray(content);

const isInlineList = (
  label: MarkdownInlineInput | readonly MarkdownInlineInput[]
): label is readonly MarkdownInlineInput[] => Array.isArray(label);

const phrasing = (input: MarkdownInlineInput): PhrasingContent =>
  typeof input === 'string'
    ? { type: 'text', value: oneLine(input) }
    : (input as unknown as PhrasingContent);

const emptyText = (): PhrasingContent => ({ type: 'text', value: '' });

const isEmptyText = (node: PhrasingContent): boolean =>
  node.type === 'text' && node.value === '';

// A break at either edge prints as a literal `\` or loose markers.
const withoutEdgeBreaks = (
  inputs: readonly MarkdownInlineInput[]
): PhrasingContent[] => {
  const children = inputs.map(phrasing).filter((node) => !isEmptyText(node));
  let start = 0;
  let end = children.length;
  while (start < end && children[start]!.type === 'break') {
    start += 1;
  }
  while (end > start && children[end - 1]!.type === 'break') {
    end -= 1;
  }
  return children.slice(start, end);
};

// Only a paragraph breaks a line: a heading with one turns setext, and the
// Slack fallback reads a line at a time.
const inlineChildren = (
  inputs: readonly MarkdownInlineInput[]
): PhrasingContent[] =>
  withoutEdgeBreaks(inputs).map((node) =>
    node.type === 'break' ? { type: 'text', value: ' ' } : node
  );

const rootContent = (content: MarkdownContent): RootContent[] =>
  isContentList(content)
    ? content.flatMap(rootContent)
    : [content as unknown as RootContent];

const isInlineInput = (
  item: MarkdownInlineInput | MarkdownContent
): item is MarkdownInlineInput =>
  typeof item === 'string' ||
  (!isContentList(item) && item[markdownContent] === 'inline');

const itemContent = (
  item: MarkdownInlineInput | MarkdownContent
): ListItem['children'] =>
  isInlineInput(item)
    ? [{ type: 'paragraph', children: withoutEdgeBreaks([item]) }]
    : (rootContent(item) as ListItem['children']);

// GFM reads a list number of at most nine digits, so the last item's must fit.
const MAX_LIST_NUMBER = 999_999_999;

const isListStart = (
  start: number | undefined,
  count: number
): start is number =>
  start !== undefined &&
  Number.isInteger(start) &&
  start >= 0 &&
  start + Math.max(count - 1, 0) <= MAX_LIST_NUMBER;

// Printed as written, for Markdown that is already safe. Trailing whitespace
// would add blank lines between blocks.
const verbatim = (markdown: string): MarkdownBlock =>
  block({
    type: VERBATIM_TYPE,
    value: markdown.trimEnd(),
  } as unknown as RootContent);

// An empty wrapper prints its markers alone: `****` reads as a thematic break.
const wrapper = (
  type: 'strong' | 'emphasis',
  inputs: MarkdownInlineInput[]
): MarkdownInline => {
  const children = inlineChildren(inputs);
  return inline(children.length === 0 ? emptyText() : { type, children });
};

const inlineRuns = (
  runs: MarkdownInlineInput | readonly MarkdownInlineInput[]
): PhrasingContent[] => inlineChildren(isInlineList(runs) ? runs : [runs]);

/**
 * Builds Markdown as content rather than strings, so escaping follows where
 * each value lands. Links and images apply the URL policy in
 * `src/validate/url.ts`: a blocked link keeps its label on
 * {@link BLOCKED_HREF}, and a blocked image degrades to its alt text.
 *
 * @example
 * md.list(rows.map((row) => md.paragraph(md.strong(row.label), ': ', row.value)))
 */
export const md = {
  text: (value: string): MarkdownInline => inline(phrasing(value)),
  strong: (...children: MarkdownInlineInput[]): MarkdownInline =>
    wrapper('strong', children),
  emphasis: (...children: MarkdownInlineInput[]): MarkdownInline =>
    wrapper('emphasis', children),
  code: (value: string): MarkdownInline =>
    inline(
      value === '' ? emptyText() : { type: 'inlineCode', value: oneLine(value) }
    ),
  link: (
    label: MarkdownInlineInput | readonly MarkdownInlineInput[],
    href: string
  ): MarkdownInline =>
    inline({
      type: 'link',
      url: sanitizeNavigationHref(href) ?? BLOCKED_HREF,
      children: inlineRuns(label),
    }),
  image: (alt: string, src: string): MarkdownInline => {
    const url = sanitizeAssetUrl(src);
    return url === null
      ? inline(phrasing(alt))
      : inline({ type: 'image', url, alt: oneLine(alt) });
  },
  /** A hard line break, printed as a backslash before the line ending. Outside a paragraph, or at its edge, it is a space or nothing. */
  break: (): MarkdownInline => inline({ type: 'break' }),
  paragraph: (...children: MarkdownInlineInput[]): MarkdownBlock =>
    block({ type: 'paragraph', children: withoutEdgeBreaks(children) }),
  heading: (
    depth: 1 | 2 | 3 | 4 | 5 | 6,
    ...children: MarkdownInlineInput[]
  ): MarkdownBlock =>
    block({ type: 'heading', depth, children: inlineChildren(children) }),
  /** A quote with no blocks, such as one holding only a hidden child, is dropped. */
  blockquote: (...children: MarkdownContent[]): MarkdownContent => {
    const content = rootContent(children);
    return content.length === 0
      ? []
      : block({
          type: 'blockquote',
          children: content as Blockquote['children'],
        });
  },
  /**
   * An item that is inline input becomes one paragraph; one with no blocks,
   * such as a hidden child, is dropped. A `start` that would print a marker
   * GFM does not read as a list number is ignored.
   */
  list: (
    items: readonly (MarkdownInlineInput | MarkdownContent)[],
    { ordered = false, start }: { ordered?: boolean; start?: number } = {}
  ): MarkdownBlock => {
    const children = items.flatMap((item): ListItem[] => {
      const content = itemContent(item);
      return content.length === 0
        ? []
        : [{ type: 'listItem', spread: false, children: content }];
    });
    return block({
      type: 'list',
      ordered,
      ...(isListStart(start, children.length) ? { start } : {}),
      spread: false,
      children,
    });
  },
  /** A cell is one inline run or several. GFM trims a cell's edge whitespace. */
  table: (
    columns: readonly (MarkdownInlineInput | readonly MarkdownInlineInput[])[],
    rows: readonly (readonly (
      MarkdownInlineInput | readonly MarkdownInlineInput[]
    )[])[]
  ): MarkdownBlock =>
    block({
      type: 'table',
      children: [columns, ...rows].map((cells): TableRow => ({
        type: 'tableRow',
        children: cells.map((cell) => ({
          type: 'tableCell',
          children: inlineRuns(cell),
        })),
      })),
    }),
  /** An unsafe `language` is dropped. */
  codeBlock: (value: string, language?: string): MarkdownBlock =>
    block({
      type: 'code',
      lang:
        language !== undefined && FENCE_INFO_RE.test(language)
          ? language
          : null,
      value,
    }),
  /** Authored Markdown source, after {@link sanitizeMarkdownSource}. */
  authored: (source: string): MarkdownBlock =>
    verbatim(sanitizeMarkdownSource(source)),
  /** Plain `text` with a leading `label:` in strong, as {@link boldLabelPrefix} does for GFM. */
  boldLabelPrefix: (
    text: string,
    label: string | undefined
  ): MarkdownInline[] =>
    label && text.startsWith(`${label}:`)
      ? [md.strong(label), md.text(text.slice(label.length))]
      : [md.text(text)],
  /** `label` uppercased in strong, as its own paragraph. */
  boldSectionLabel: (label: string): MarkdownBlock =>
    md.paragraph(md.strong(label.toUpperCase())),
};

/** A renderer's string output as content, printed as written. */
export const markdownFromString = (markdown: string): MarkdownContent =>
  markdown.trim() === '' ? [] : verbatim(markdown);

const asText: Handle = (
  node: { value?: string; alt?: string | null },
  ...rest
) =>
  defaultHandlers.text(
    { type: 'text', value: node.value ?? node.alt ?? '' },
    ...rest
  );

// The URL policy again at serialization, for content built outside `md`.
const handlers: Record<string, Handle> = {
  link: (node: Link, ...rest) =>
    defaultHandlers.link(
      { ...node, url: sanitizeNavigationHref(node.url) ?? BLOCKED_HREF },
      ...rest
    ),
  definition: (node: Definition, ...rest) =>
    defaultHandlers.definition(
      { ...node, url: sanitizeNavigationHref(node.url) ?? BLOCKED_HREF },
      ...rest
    ),
  image: (node: Image, ...rest) => {
    const url = sanitizeAssetUrl(node.url);
    return url === null
      ? asText(node, ...rest)
      : defaultHandlers.image({ ...node, url }, ...rest);
  },
  html: asText,
  [VERBATIM_TYPE]: (node: { value: string }) => node.value,
};

const OPTIONS: Options = {
  bullet: '-',
  // With `*`, emphasis around strong prints `***x***`, which the Slack
  // fallback cannot split. `_` costs character references around emphasis
  // inside a word.
  emphasis: '_',
  fence: '`',
  listItemIndent: 'one',
  rule: '-',
  strong: '*',
  extensions: [gfmToMarkdown({ tablePipeAlign: false })],
  handlers: handlers as Options['handlers'],
};

/** `content` as flat mdast blocks, typed `unknown` so no declaration names mdast. */
export const markdownBlocks = (content: MarkdownContent): readonly unknown[] =>
  rootContent(content);

/** `content` as GFM, without a trailing line break. */
export const serializeMarkdown = (content: MarkdownContent): string =>
  toMarkdown({ type: 'root', children: rootContent(content) }, OPTIONS).replace(
    /\n$/,
    ''
  );

/**
 * Bolds a leading `Label:` prefix, leaving the rest of the line untouched.
 *
 * Lets a primitive whose text renderer already emits `Label: summary` reuse
 * that line on the markdown surface and still scan alongside bolder
 * neighbours. A no-op when `label` is absent or the text does not lead with it.
 */
export const boldLabelPrefix = (
  text: string,
  label: string | undefined
): string => {
  if (!label) {
    return text;
  }
  return text.startsWith(`${label}:`)
    ? `${serializeMarkdown(md.paragraph(md.strong(label)))}${text.slice(label.length)}`
    : text;
};

/**
 * Bolds and uppercases a section label so it reads as a heading-equivalent atop
 * list-shaped markdown blocks (stat groups, description lists, badge groups).
 */
export const boldSectionLabel = (label: string): string =>
  serializeMarkdown(md.boldSectionLabel(label));

/**
 * A markdown renderer for a primitive whose text output is already valid GFM.
 *
 * Pass `options.label` to lift the node's label into bold via
 * {@link boldLabelPrefix}.
 */
export const defaultMarkdownFromText =
  <TNode>(
    renderText: (node: TNode) => string,
    options: {
      label?: (node: TNode) => string | undefined;
    } = {}
  ): ((node: TNode) => string) =>
  (node) => {
    const text = renderText(node);
    return options.label ? boldLabelPrefix(text, options.label(node)) : text;
  };
