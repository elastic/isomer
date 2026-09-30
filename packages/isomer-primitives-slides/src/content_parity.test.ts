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
  'href',
  'hrefs',
  'url',
  'size',
  'language',
  'marks',
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

const entities: Record<string, string> = {
  '&lt;': '<',
  '&gt;': '>',
  '&amp;': '&',
};

/** Inverts `code`, `codeBlock`, and `marksSlack`: code stays literal, strong loses its delimiters, and entities decode. */
const readMrkdwn = (mrkdwn: string): string =>
  mrkdwn
    .split(/(```\n[\s\S]*?\n```|`[^`\n]+`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part.replace(/^```\n|\n```$|^`|`$/g, '')
        : part
            .replace(/\*(?=\S)([^*\n]*?\S)\*/g, '$1')
            .replace(/&(?:lt|gt|amp);/g, (entity) => entities[entity] ?? entity)
    )
    .join('');

const stringLeaves = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(stringLeaves);
  }
  const { type, elements, text } = (value ?? {}) as {
    type?: unknown;
    elements?: { text?: string }[];
    text?: unknown;
  };
  if (type === 'mrkdwn' && typeof text === 'string') {
    return [readMrkdwn(text)];
  }
  if (type === 'rich_text_section' && elements) {
    return [elements.map(({ text: run = '' }) => run).join('')];
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

// Raw HTML is markup a reader never sees as text.
const textOf = (node: Nodes): string =>
  node.type === 'html'
    ? ''
    : 'value' in node
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

// Surfaces wrap lines and set some labels in capitals.
const normalize = (text: string) =>
  text.replace(/\s+/g, ' ').trim().toLowerCase();

const surfaces = {
  text: (node: PrimitiveNode) => runtime.surfaces.text.renderNode(node),
  markdown: (node: PrimitiveNode) =>
    readMarkdown(runtime.surfaces.markdown.renderNode(node)),
  slack: (node: PrimitiveNode) =>
    stringLeaves(runtime.surfaces.slack.renderNode(node).blocks).join('\n'),
};

const htmlEntities: Record<string, string> = {
  ...entities,
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

const htmlText = (node: PrimitiveNode): string => {
  const body = [
    node.type === 'slideFrame'
      ? node
      : ({ type: 'slideFrame', body: [node] } as PrimitiveNode),
  ];
  return runtime.surfaces.html
    .render({ type: 'view', body })
    .html.replace(/<style[\s\S]*?<\/style>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(
      /&(?:lt|gt|amp|quot|#x27|#39);/g,
      (entity) => htmlEntities[entity] ?? entity
    );
};

const missingFrom = (output: string, node: unknown): string[] => {
  const normalized = normalize(output);
  return authoredStrings(node)
    .flatMap((text) => text.split('\n'))
    .filter(
      (word) => word.trim() && !normalized.includes(normalize(stripMarks(word)))
    );
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

  it.each(rows)('$name draws every authored string', ({ node }) => {
    expect(missingFrom(htmlText(node), node)).toEqual([]);
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

type Path = (string | number)[];

const wordPaths = (value: unknown, path: Path = [], key = ''): Path[] => {
  if (notWords.has(key)) {
    return [];
  }
  if (typeof value === 'string') {
    return value.trim() ? [path] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      wordPaths(entry, [...path, index], key)
    );
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([name, entry]) =>
      wordPaths(entry, [...path, name], name)
    );
  }
  return [];
};

const appendAt = (
  value: unknown,
  [head, ...rest]: Path,
  tail: string
): unknown => {
  if (head === undefined) {
    return `${value as string}${tail}`;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map((entry, index) =>
      index === head ? appendAt(entry, rest, tail) : entry
    );
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: appendAt(record[head], rest, tail) };
};

// No paired marks, so every surface prints it as written.
// One field at a time: mrkdwn has no escape for `` ` `` or `*`, so a delimiter in each of two fields Slack joins into one string can pair.
const literals = ' &lt; <b> & &amp;lt; a ` b * c ** d';

const literalRows = rows.flatMap(({ name, node }) =>
  wordPaths(node).map((path) => ({
    name: `${name} ${path.join('.')}`,
    node: appendAt(node, path, literals) as PrimitiveNode,
  }))
);

describe('entity-like text and unpaired delimiters', () => {
  it.each(literalRows)('$name prints them as authored', ({ node }) => {
    for (const [surface, render] of Object.entries(surfaces)) {
      expect(missingFrom(render(node), node), surface).toEqual([]);
    }
  });
});
