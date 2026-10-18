/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { exampleNodes, type PrimitiveNode } from '@elastic/isomer-sdk';
import type { Nodes } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';
import { stripMarks } from './render/marks';

/** Renders nodes validation rejects, which these tests feed renderers on purpose. */
const collect = { onValidationError: 'collect' } as const;

export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

/** Keys holding identifiers, enums, addresses, or words another field already holds. */
const notWords = new Set([
  'type',
  'id',
  'from',
  'to',
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
  'chrome',
  'slide',
  'surface',
  'placement',
  'of',
  'direction',
  'op',
  'role',
  'format',
  'highlightPrefix',
  'highlight',
  'add',
  'remove',
]);

/** Embedded bodies print as another surface's output, so only the render's own words are checked. */
const embedding = new Set(['slideRender', 'slideRenderGrid']);

const withoutEmbedded = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withoutEmbedded);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const { type } = value as { type?: unknown };
  return Object.fromEntries(
    Object.entries(value)
      .filter(
        ([key]) =>
          !(key === 'body' && typeof type === 'string' && embedding.has(type))
      )
      .map(([key, entry]) => [key, withoutEmbedded(entry)])
  );
};

/** Fields whose line breaks are meant, or that no degraded surface prints. */
const keptAsAuthored = new Set([
  'slideCode.text',
  'slideCodeTrace.text',
  'slideCommand.command',
  'slideDiff.text',
  'slideTranscript.text',
]);

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

const formatting = /([*_~])(?=\S)([^\n]*?\S)\1/g;

/** Every `*`, `_`, and `~` pair Slack could read as formatting, outermost first. */
const unformat = (text: string): string => {
  let read = text;
  for (let last = ''; last !== read;) {
    last = read;
    read = read.replace(formatting, '$2');
  }
  return read;
};

/** Slack's reading of `mrkdwn`: code keeps its characters, other text loses its formatting pairs, and `<url|label>` markup and entities decode in both. */
const readMrkdwn = (mrkdwn: string): string =>
  mrkdwn
    .split(/(```\n[\s\S]*?\n```|`[^`\n]+`)/)
    .map((part, index) =>
      (index % 2 === 1
        ? part.replace(/^```\n|\n```$|^`|`$/g, '')
        : unformat(part)
      )
        .replace(
          /<([^<>|]*)(?:\|([^<>]*))?>/g,
          (_, url: string, label?: string) => label ?? url
        )
        .replace(/&(?:lt|gt|amp);/g, (entity) => entities[entity] ?? entity)
    )
    .join('');

const richRuns = new Set([
  'rich_text_section',
  'rich_text_quote',
  'rich_text_preformatted',
]);

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
  if (typeof type === 'string' && richRuns.has(type) && elements) {
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

export const surfaces = {
  text: (node: PrimitiveNode) =>
    runtime.surfaces.text.renderNode(node, collect),
  markdown: (node: PrimitiveNode) =>
    readMarkdown(runtime.surfaces.markdown.renderNode(node, collect)),
  slack: (node: PrimitiveNode) =>
    stringLeaves(runtime.surfaces.slack.renderNode(node, collect).blocks).join(
      '\n'
    ),
};

const htmlEntities: Record<string, string> = {
  ...entities,
  '&quot;': '"',
  '&#x27;': "'",
  '&#39;': "'",
};

export const htmlText = (node: PrimitiveNode): string => {
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

export const missingFrom = (output: string, node: unknown): string[] => {
  const normalized = normalize(output);
  return authoredStrings(withoutEmbedded(node))
    .flatMap((text) => text.split('\n'))
    .filter(
      (word) => word.trim() && !normalized.includes(normalize(stripMarks(word)))
    );
};

export const rows = slideDeckPrimitives.flatMap(({ type, examples }) =>
  exampleNodes({ examples }).map((example, index) => ({
    name: `${type}#${index}`,
    node: example,
  }))
);

export const terminators = {
  '\\n': '\n',
  '\\r': '\r',
  '\\r\\n': '\r\n',
  'U+2028': '\u2028',
  'U+2029': '\u2029',
};

export const withTail = (
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
const literals = ' &lt; <b> & &amp;lt; a ` b * c ** d';

export const literalRows = rows.flatMap(({ name, node }) =>
  wordPaths(withoutEmbedded(node)).map((path) => ({
    name: `${name} ${path.join('.')}`,
    node: appendAt(node, path, literals) as PrimitiveNode,
  }))
);

// Each alone, so a field that sends one to `mrkdwn` fails by name.
const mrkdwnCases = {
  asterisks: ' *a*',
  underscores: ' _a_',
  tildes: ' ~a~',
  backticks: ' `a`',
  fence: ' a```b',
  'angle brackets': ' <b>',
  entity: ' &amp;',
};

const outputSurfaces = new Set(['markdown', 'text', 'slack']);

// A body shown as another surface's output prints that surface's escaped source, and a grid always draws one.
const withoutOutputBodies = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(withoutOutputBodies);
  }
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const { type, surface } = value as { type?: unknown; surface?: unknown };
  const printsOutput =
    type === 'slideRenderGrid' ||
    (type === 'slideRender' &&
      typeof surface === 'string' &&
      outputSurfaces.has(surface));
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !(key === 'body' && printsOutput))
      .map(([key, entry]) => [key, withoutOutputBodies(entry)])
  );
};

const mrkdwnRows = rows.flatMap(({ name, node }) =>
  wordPaths(withoutOutputBodies(node)).flatMap((path) =>
    Object.entries(mrkdwnCases).map(([kind, tail]) => ({
      name: `${name} ${path.join('.')}`,
      kind,
      node: appendAt(node, path, tail) as PrimitiveNode,
    }))
  )
);

/** Vitest runs files in parallel, so the Slack cases split across `content_parity_slack_<n>.test.ts`. */
export const SLACK_SHARDS = 4;

/** The Slack cases for the 1-based `shard` of {@link SLACK_SHARDS}. */
export const mrkdwnShard = (shard: number) => {
  const size = Math.ceil(mrkdwnRows.length / SLACK_SHARDS);
  return mrkdwnRows.slice((shard - 1) * size, shard * size);
};

/** Each authored line as the slide draws it: marks drawn where the field takes them, as written where it does not. */
const drawnLines = (node: PrimitiveNode): string[] => {
  const lines = authoredStrings(node)
    .flatMap((text) => text.split('\n'))
    .filter((line) => line.trim());
  if (lines.every((line) => stripMarks(line) === line)) {
    return lines;
  }
  const drawn = normalize(htmlText(node));
  return lines.map((line) =>
    drawn.includes(normalize(line)) ? line : stripMarks(line)
  );
};

/** Drawn lines the Slack surface does not carry as authored. */
export const missingFromSlack = (node: PrimitiveNode): string[] => {
  const slack = normalize(surfaces.slack(node));
  return drawnLines(node).filter((line) => !slack.includes(normalize(line)));
};
