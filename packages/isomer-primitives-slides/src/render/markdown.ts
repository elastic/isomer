/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every Markdown the pack prints: an mdast node per value, serialized by
// `mdast-util-to-markdown`, so the library owns escaping, block markers, fence
// lengths, and table cells.

import type { Nodes, PhrasingContent } from 'mdast';
import { gfmTableToMarkdown } from 'mdast-util-gfm-table';
import { type Options, toMarkdown } from 'mdast-util-to-markdown';

import { LINE_TERMINATORS, parseMarks } from './marks';

// Cells are not padded to their column, so a table costs no more to read raw than to render.
const options: Options = {
  extensions: [gfmTableToMarkdown({ tablePipeAlign: false })],
};

/** `node` as Markdown, without the serializer's trailing line break. */
const serialize = (node: Nodes): string =>
  toMarkdown(node, options).replace(/\n$/, '');

const inline = (children: PhrasingContent[]): string =>
  serialize({ type: 'paragraph', children });

/**
 * `text` as mdast phrasing: one `inlineCode` or `strong` node per mark, every
 * line terminator a space. `flat` prints a strong run as plain text, for a
 * caller that wraps the whole value in `strong`, where a strong mark cannot nest.
 */
const phrasing = (
  text: string,
  { flat = false }: { flat?: boolean } = {}
): PhrasingContent[] =>
  parseMarks(text.replace(LINE_TERMINATORS, ' ')).map(({ kind, text: run }) =>
    kind === 'code'
      ? { type: 'inlineCode', value: run }
      : kind === 'strong' && !flat
        ? { type: 'strong', children: [{ type: 'text', value: run }] }
        : { type: 'text', value: run }
  );

/** Plain authored text as inline Markdown: line breaks become spaces, and nothing in it reads as Markdown syntax. */
export const markdownText = (text: string): string =>
  inline([{ type: 'text', value: text.replace(LINE_TERMINATORS, ' ') }]);

/** `text` as inline Markdown: code spans and strong stay marks, and the rest is escaped as {@link markdownText} escapes it. */
export const marksMarkdown = (text: string): string => inline(phrasing(text));

/** `text` as one strong run: code spans stay marks, and a strong mark of its own prints as plain text. */
export const markdownStrong = (text: string): string =>
  inline([{ type: 'strong', children: phrasing(text, { flat: true }) }]);

/** `code` as an inline Markdown code span, fenced past any backtick run in it and kept on one line. */
export const markdownCode = (code: string): string =>
  inline([{ type: 'inlineCode', value: code.replace(LINE_TERMINATORS, ' ') }]);

/** A GFM pipe table, marks kept and everything else escaped. The Slack fallback turns it into a native `table` block. */
export const markdownTable = (
  columns: readonly string[],
  rows: readonly (readonly string[])[]
): string =>
  serialize({
    type: 'table',
    children: [columns, ...rows].map((cells) => ({
      type: 'tableRow',
      children: cells.map((cell) => ({
        type: 'tableCell',
        children: phrasing(cell),
      })),
    })),
  });

// A fence-info string only allows word-ish tokens; anything else would
// terminate the fence early or inject markdown.
const fenceInfo = (language: string | undefined): string =>
  language && /^[\w+#.-]+$/.test(language) ? language : 'text';

/** `source` as a fenced Markdown block tagged `language`, or `text` when the tag is unsafe. */
export const fencedBlock = (
  source: string,
  language: string | undefined
): string =>
  serialize({ type: 'code', lang: fenceInfo(language), value: source });
