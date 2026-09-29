/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Degraded surfaces carry every word the image draws.

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type { Nodes } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';
import { stripMarks } from './render/marks';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

/** Keys holding identifiers, enums, or addresses, not authored words. */
const notWords = new Set([
  'type',
  'id',
  'tone',
  'url',
  'size',
  'language',
  'ratio',
  'divider',
  'spacing',
  'marker',
]);

/** Fields whose line breaks are meant, or that no degraded surface prints. */
const keptAsAuthored = new Set(['slideCode.lines']);

const authoredStrings = (value: unknown, key = ''): string[] => {
  if (notWords.has(key)) {
    return [];
  }
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => authoredStrings(entry, key));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([name, entry]) =>
      authoredStrings(entry, name)
    );
  }
  return [];
};

const stringLeaves = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringLeaves);
  }
  const { type, elements } = (value ?? {}) as {
    type?: unknown;
    elements?: { text?: string }[];
  };
  if (type === 'rich_text_section' && elements) {
    return [elements.map(({ text = '' }) => text).join('')];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(stringLeaves);
  }
  return [];
};

const phrasingParents = new Set([
  'paragraph',
  'heading',
  'strong',
  'emphasis',
  'delete',
  'link',
  'tableCell',
]);

const textOf = (node: Nodes): string =>
  'value' in node
    ? node.value
    : 'children' in node
      ? node.children
          .map(textOf)
          .join(phrasingParents.has(node.type) ? '' : '\n')
      : '';

const readMarkdown = (markdown: string): string =>
  textOf(
    fromMarkdown(markdown, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    })
  );

// Marks render differently per surface, so their markers are compared away.
const normalize = (text: string) =>
  stripMarks(text)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

const surfaces = {
  text: (node: PrimitiveNode) => runtime.surfaces.text.renderNode(node),
  markdown: (node: PrimitiveNode) =>
    readMarkdown(runtime.surfaces.markdown.renderNode(node)),
  slack: (node: PrimitiveNode) =>
    stringLeaves(runtime.surfaces.slack.renderNode(node).blocks).join('\n'),
};

const missingFrom = (output: string, node: unknown): string[] => {
  const normalized = normalize(output);
  return authoredStrings(node)
    .flatMap((text) => text.split('\n'))
    .filter((word) => word.trim() && !normalized.includes(normalize(word)));
};

const rows = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.map((example, index) => ({
    name: `${type}#${index}`,
    node: example,
  }))
);

describe('content parity', () => {
  it.each(rows)('$name carries every authored string', ({ node }) => {
    for (const [surface, render] of Object.entries(surfaces)) {
      expect(missingFrom(render(node), node), surface).toEqual([]);
    }
  });
});

const terminators = {
  '\\n': '\n',
  '\\r': '\r',
  '\\r\\n': '\r\n',
  'U+2028': '\u2028',
  'U+2029': '\u2029',
};

const withTail = (
  value: unknown,
  tail: string,
  key = '',
  owner = ''
): unknown => {
  if (notWords.has(key) || keptAsAuthored.has(`${owner}.${key}`)) {
    return value;
  }
  if (typeof value === 'string') {
    return value.trim() ? `${value}${tail}` : value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => withTail(entry, tail, key, owner));
  }
  if (typeof value === 'object' && value !== null) {
    const { type } = value as { type?: unknown };
    const at = typeof type === 'string' ? type : owner;
    return Object.fromEntries(
      Object.entries(value).map(([name, entry]) => [
        name,
        withTail(entry, tail, name, at),
      ])
    );
  }
  return value;
};

const terminatorRows = rows.flatMap((row) =>
  Object.entries(terminators).map(([mark, terminator]) => ({
    ...row,
    mark,
    terminator,
  }))
);

describe('line terminators in one-line fields', () => {
  it.each(terminatorRows)(
    '$name reads as a space after $mark',
    ({ node, terminator }) => {
      const broken = withTail(node, `${terminator}tail`) as PrimitiveNode;
      const spaced = withTail(node, ' tail') as PrimitiveNode;
      expect(surfaces.text(broken)).toBe(surfaces.text(spaced));
      expect(runtime.surfaces.markdown.renderNode(broken)).toBe(
        runtime.surfaces.markdown.renderNode(spaced)
      );
      expect(runtime.surfaces.slack.renderNode(broken).blocks).toEqual(
        runtime.surfaces.slack.renderNode(spaced).blocks
      );
      expect(missingFrom(surfaces.text(spaced), spaced)).toEqual([]);
    }
  );
});
