/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Reads Markdown back as a GFM reader would, so a test can compare what a
// reader sees with what was authored.

import type { PhrasingContent, RootContent } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmTableFromMarkdown } from 'mdast-util-gfm-table';
import { gfmTable } from 'micromark-extension-gfm-table';

import type { MarkRun } from './marks';

/** Values that read as Markdown syntax somewhere: at a line start, inline, in a cell, or in a code span. */
export const hostileValues = [
  '[x](javascript:alert(1))',
  '![img](javascript:alert(1))',
  '<img src=x onerror=y>',
  '<https://example.test>',
  '*a* _b_ `c` | d \\ &amp; &#32;',
  '\\*x\\*',
  '# Title',
  '### Deep',
  '- item',
  '+ item',
  '* item',
  '1. item',
  '2) item',
  '> quote',
  '---',
  '***',
  '=== ',
  '~~~js',
  '```js',
  '    indented code',
  '\t# not a heading',
  '  label',
  'trailing  ',
  '| a | b |',
  'a|b',
  'p95 <y',
  'a\nb\r\nc\rd\u2028e\u2029f',
  '**Bold** and `a_b` and [x](y)',
  'a ** bold ** b',
  '**a\u2028b** `c\rd`',
  '# **Bold**',
  '`**x**`',
  '2 * 3 and a ` tick',
  '`a` and ``b`` end',
  '` `edge` `',
];

/** The blocks a GFM reader finds in `markdown`. */
export const readBlocks = (markdown: string): RootContent[] =>
  fromMarkdown(markdown, {
    extensions: [gfmTable()],
    mdastExtensions: [gfmTableFromMarkdown()],
  }).children;

const textOf = (nodes: readonly PhrasingContent[]): string =>
  nodes
    .map((node) =>
      'value' in node
        ? node.value
        : 'children' in node
          ? textOf(node.children)
          : ''
    )
    .join('');

/** `nodes` as the runs of {@link MarkRun}; any other inline construct keeps its mdast type as its kind. */
export const readRuns = (nodes: readonly PhrasingContent[]): MarkRun[] =>
  nodes.map((node) =>
    node.type === 'text'
      ? { kind: 'text', text: node.value }
      : node.type === 'inlineCode'
        ? { kind: 'code', text: node.value }
        : node.type === 'strong'
          ? { kind: 'strong', text: textOf(node.children) }
          : ({ kind: node.type, text: textOf([node]) } as unknown as MarkRun)
  );

/** The runs of the one paragraph in `markdown`; anything else a reader finds fails the test. */
export const readParagraph = (markdown: string): MarkRun[] => {
  const blocks = readBlocks(markdown);
  if (markdown === '') {
    return [];
  }
  if (blocks.length !== 1 || blocks[0]?.type !== 'paragraph') {
    throw new Error(
      `expected one paragraph, read ${blocks.map(({ type }) => type).join(', ') || 'nothing'}`
    );
  }
  return readRuns(blocks[0].children);
};
