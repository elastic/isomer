/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Surface parity: text, Markdown and Slack carry the readings of every Scene
// the pack resolves for every example, nested charts included, as Rendering's
// "Text, Markdown and Slack" states them. Scenes are recorded where the pack
// resolves them, so a new chart primitive or example is covered with no change
// here.

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  primitiveExamples,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import type { Nodes, Table } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { describe, expect, it } from 'vitest';

import { createChartsPack } from './pack';
import type { ChartNode, ResolveSceneOptions } from './render/context';
import { resolveChart } from './scene/resolve';
import type { Scene } from './scene/types';

const resolved: { node: ChartNode; scene: Scene }[] = [];
const pack = createChartsPack({
  resolveScene: (node: ChartNode, options: ResolveSceneOptions) => {
    const scene = resolveChart(node, options);
    resolved.push({ node, scene });
    return scene;
  },
});
const runtime = createIsomerRuntime({ packs: [pack] });

const view = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const examples = pack.primitives.flatMap((definition) =>
  primitiveExamples(definition).map(({ name, node }) => ({
    type: definition.type,
    name: name ?? '(unnamed)',
    composition: view(node),
  }))
);

/** What `render` returns, and every Scene the pack resolved while it ran. */
const recording = <T>(render: () => T) => {
  resolved.length = 0;
  const output = render();
  return { output, scenes: resolved.splice(0) };
};

// The readings every text surface carries, from Rendering's contract.

const notesOf = ({ interactions }: Scene) =>
  interactions.emphasis.flatMap(({ note }) => (note ? [note] : []));

/** The summary, description and notes, in order. */
const sentencesOf = (scene: Scene): string[] => [
  scene.summary,
  ...(scene.description ? [scene.description] : []),
  ...notesOf(scene),
];

/** The table as rows of strings: header, rows in `order`, footer; empty columns left out. */
const tableOf = (
  { table }: Scene,
  order: readonly number[] = table.rows.map((_, index) => index),
  { rows: maxRows = Infinity, columns: maxColumns = Infinity } = {}
): string[][] | undefined => {
  const shown = table.columns
    .flatMap((column, index) => (column.empty ? [] : [index]))
    .slice(0, maxColumns);
  if (table.rows.length === 0 || shown.length === 0) {
    return undefined;
  }
  const pick = (cells: readonly string[]) =>
    shown.map((index) => cells[index] ?? '');
  const footer = table.footer ? [pick(table.footer)] : [];
  return [
    pick(table.columns.map(({ label }) => label)),
    ...order
      .slice(0, maxRows - 1 - footer.length)
      .map((position) => pick(table.rows[position]!.cells)),
    ...footer,
  ];
};

/** Whether `needles` occur in `haystack` in order. Reports the first that does not. */
const expectInOrder = (haystack: string, needles: readonly string[]) => {
  let from = 0;
  for (const needle of needles) {
    const at = haystack.indexOf(needle, from);
    expect(at, `"${needle}" in order in:\n${haystack}`).toBeGreaterThanOrEqual(
      0
    );
    from = at + needle.length;
  }
};

// Slack may split a long paragraph where it has whitespace.
const squash = (text: string) => text.replace(/\s+/g, '');

const chartCases = examples.map((example) => ({
  ...example,
  scenes: recording(() => runtime.surfaces.text.render(example.composition))
    .scenes,
}));

describe('surface parity', () => {
  it('reaches a Scene for every chart example, nested or not', () => {
    const charted = new Set<string>(
      chartCases.flatMap(({ scenes }) => scenes.map(({ node }) => node.type))
    );
    expect([...charted].sort()).toEqual(
      expect.arrayContaining(['dataTable', 'metric', 'xyChart'])
    );
    for (const { type, scenes } of chartCases) {
      if (charted.has(type)) {
        expect(scenes.map(({ node }) => node.type)).toContain(type);
      }
    }
    expect(chartCases.some(({ type }) => type === 'grid')).toBe(true);
    expect(
      chartCases
        .filter(({ type }) => type === 'grid')
        .every(({ scenes }) => scenes.length > 0)
    ).toBe(true);
  });

  const cases = chartCases.filter(({ scenes }) => scenes.length > 0);

  it.each(cases)(
    'text: $type: $name writes each Scene’s sentences, table and link',
    ({ composition }) => {
      const { output, scenes } = recording(() =>
        runtime.surfaces.text.render(composition)
      );
      expect(scenes.length).toBeGreaterThan(0);
      for (const { scene } of scenes) {
        expectInOrder(output, sentencesOf(scene));
        const table = tableOf(scene);
        if (table) {
          expect(output).toContain(
            table.map((row) => row.join(' | ')).join('\n')
          );
        }
        const { link } = scene.interactions;
        if (link) {
          expect(output).toContain(`${link.label}: ${link.href}`);
        }
      }
    }
  );

  it.each(cases)(
    'Markdown: $type: $name reads back as each Scene’s sentences, GFM table and link',
    ({ composition }) => {
      const { output, scenes } = recording(() =>
        runtime.surfaces.markdown.render(composition)
      );
      const tree = fromMarkdown(output, {
        extensions: [gfm()],
        mdastExtensions: [gfmFromMarkdown()],
      });
      const paragraphs: string[] = [];
      const tables: string[][][] = [];
      const links: { href: string; label: string }[] = [];
      const visit = (node: Nodes) => {
        if (node.type === 'paragraph') {
          paragraphs.push(textOf(node));
        }
        if (node.type === 'table') {
          tables.push(rowsOf(node));
        }
        if (node.type === 'link') {
          links.push({ href: node.url, label: textOf(node) });
        }
        if ('children' in node) {
          node.children.forEach(visit);
        }
      };
      visit(tree);
      for (const { scene } of scenes) {
        expectInOrder(paragraphs.join('\n'), sentencesOf(scene));
        const table = tableOf(scene);
        if (table) {
          expect(tables).toContainEqual(table);
        }
        const { link } = scene.interactions;
        if (link) {
          expect(links).toContainEqual(link);
        }
      }
    }
  );

  it.each(cases)(
    'Slack without pictures: $type: $name carries each Scene’s sentences, table and link',
    ({ composition }) => {
      const { output, scenes } = recording(() =>
        runtime.surfaces.slack.render(composition, { heading: false })
      );
      expect(output.assets).toEqual([]);
      const read = readSlack(output.blocks);
      for (const { scene } of scenes) {
        expectInOrder(squash(read.text), sentencesOf(scene).map(squash));
        const table = tableOf(scene, slackOrder(scene), SLACK_TABLE);
        if (table) {
          expect(read.tables).toContainEqual(table);
        }
        const { link } = scene.interactions;
        if (link) {
          expect(read.links).toContainEqual(link);
        }
      }
    }
  );

  it.each(cases)(
    'Slack with pictures: $type: $name sends each picture with its text as alt text, and the rest as text',
    ({ composition }) => {
      const { output, scenes } = recording(() =>
        runtime.surfaces.slack.render(composition, {
          heading: false,
          collectAssets: true,
        })
      );
      const pictured = output.assets.map(({ node }) => JSON.stringify(node));
      const alts: string[] = [];
      JSON.stringify(output.blocks, (_, value: unknown) => {
        const image = value as { type?: unknown; alt_text?: unknown } | null;
        if (image?.type === 'image' && typeof image.alt_text === 'string') {
          alts.push(image.alt_text);
        }
        return value;
      });
      expect(alts).toHaveLength(output.assets.length);
      output.assets.forEach(({ node }, index) => {
        expect(pack.slackAssetTypes).toContain(node.type);
        const text = runtime.surfaces.text.renderNode(node);
        const alt = alts[index]!;
        if (text.length <= SLACK_LIMITS.imageAltTextChars) {
          expect(alt).toBe(text);
        } else {
          expect(alt.length).toBeLessThanOrEqual(
            SLACK_LIMITS.imageAltTextChars
          );
          expect(text.startsWith(alt.slice(0, -1).trimEnd())).toBe(true);
        }
      });
      const read = readSlack(output.blocks);
      for (const { node, scene } of scenes) {
        if (pictured.includes(JSON.stringify(node))) {
          continue;
        }
        expectInOrder(squash(read.text), sentencesOf(scene).map(squash));
        const table = tableOf(scene, slackOrder(scene), SLACK_TABLE);
        if (table) {
          expect(read.tables).toContainEqual(table);
        }
      }
    }
  );
});

const SLACK_TABLE = {
  rows: SLACK_LIMITS.tableRows,
  columns: SLACK_LIMITS.tableColumns,
};

/** Slack's table is in the order a table first shows its rows; any other Scene's in `data` order. */
const slackOrder = (scene: Scene): readonly number[] | undefined =>
  scene.kind === 'table' ? scene.order : undefined;

const textOf = (node: Nodes): string =>
  'value' in node
    ? node.value
    : 'children' in node
      ? node.children.map(textOf).join('')
      : '';

const rowsOf = (table: Table): string[][] =>
  table.children.map((row) => row.children.map(textOf));

/** mrkdwn as Slack shows it: links as their label, then entities decoded. */
const readMrkdwn = (
  mrkdwn: string,
  links: { href: string; label: string }[]
): string =>
  mrkdwn
    .replace(/<([^|>]+)\|([^>]*)>/g, (_, href: string, label: string) => {
      links.push({ href, label: decode(label) });
      return label;
    })
    .split(/(&lt;|&gt;|&amp;)/)
    .map(decode)
    .join('');

const decode = (text: string) =>
  text.replace(/&lt;|&gt;|&amp;/g, (entity) =>
    entity === '&lt;' ? '<' : entity === '&gt;' ? '>' : '&'
  );

/** Every string Slack shows, in block order; each native table as rows of strings; each link. */
const readSlack = (blocks: readonly unknown[]) => {
  const texts: string[] = [];
  const tables: string[][][] = [];
  const links: { href: string; label: string }[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== 'object' || value === null) {
      return;
    }
    const block = value as Record<string, unknown>;
    if (block.type === 'table') {
      tables.push(
        (block.rows as { text: string }[][]).map((row) =>
          row.map(({ text }) => text)
        )
      );
      return;
    }
    if (block.type === 'mrkdwn' && typeof block.text === 'string') {
      texts.push(readMrkdwn(block.text, links));
      return;
    }
    if (block.type === 'link' && typeof block.url === 'string') {
      const label = typeof block.text === 'string' ? block.text : block.url;
      links.push({ href: block.url, label });
      texts.push(label);
      return;
    }
    if (typeof block.text === 'string') {
      texts.push(block.text);
    }
    Object.values(block).forEach(visit);
  };
  visit(blocks);
  return { text: texts.join('\n'), tables, links };
};
