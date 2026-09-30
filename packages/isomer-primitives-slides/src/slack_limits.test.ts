/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every Slack slot whose limit is below what its schema accepts keeps authored text whole at its limit and one past it.

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { SLACK_LIMITS, type SlackBlock } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

type Slot = 'header' | 'section' | 'context' | 'fields';

interface LimitCase {
  name: string;
  slot: Slot;
  limit: number;
  /** One character of filler, and what it prints as in `mrkdwn` or `plain_text`. */
  filler: '&' | 'x';
  max: number;
  node: (filler: string) => PrimitiveNode;
}

const long = (length: number, char = 'x') => char.repeat(length);

const cases: LimitCase[] = [
  {
    name: 'slideHeading title',
    slot: 'header',
    limit: SLACK_LIMITS.headerTextChars,
    filler: 'x',
    max: 400,
    node: (fill) => ({ type: 'slideHeading', title: `Why ${fill}` }),
  },
  {
    name: 'slideHeading lede',
    slot: 'section',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: 'x',
    max: 4000,
    node: (fill) => ({
      type: 'slideHeading',
      title: 'Why',
      lede: `So ${fill}`,
    }),
  },
  {
    name: 'slideTitle title',
    slot: 'header',
    limit: SLACK_LIMITS.headerTextChars,
    filler: 'x',
    max: 400,
    node: (fill) => ({ type: 'slideTitle', title: `Ledger ${fill}` }),
  },
  {
    name: 'slideTitle tagline',
    slot: 'section',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: 'x',
    max: 4000,
    node: (fill) => ({
      type: 'slideTitle',
      title: 'Ledger',
      tagline: `Money ${fill}`,
    }),
  },
  {
    name: 'slideTitle definition',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: 'x',
    max: 3000,
    node: (fill) => ({
      type: 'slideTitle',
      title: 'Ledger',
      definition: { term: 'ledger', text: `A book ${fill}` },
    }),
  },
  {
    name: 'slideTerritoryGroup fields',
    slot: 'fields',
    limit: SLACK_LIMITS.sectionFieldChars,
    filler: 'x',
    max: 3000,
    node: (fill) => ({
      type: 'slideTerritoryGroup',
      items: [
        { title: 'Ours', body: `We run ${fill}` },
        { title: 'Theirs', body: 'They run it' },
      ],
    }),
  },
  {
    name: 'slideSplit footnote',
    slot: 'section',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: 'x',
    max: 4000,
    node: (fill) => ({
      type: 'slideSplit',
      panes: [
        { items: [{ type: 'slideBulletList', items: ['One'] }] },
        { items: [{ type: 'slideBulletList', items: ['Two'] }] },
      ],
      footnote: `Note ${fill}`,
    }),
  },
  {
    name: 'slideCode panel',
    slot: 'section',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: 'x',
    max: 101,
    node: (fill) => ({
      type: 'slideCode',
      panels: [
        {
          file: long(231, '&'),
          lines: [...Array.from({ length: 13 }, () => long(101, '`')), fill],
        },
      ],
    }),
  },
  {
    name: 'slideFrame footer',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: '&',
    max: 231,
    node: (fill) => ({
      type: 'slideFrame',
      brand: long(231, '&'),
      section: fill,
      body: [{ type: 'slideHeading', title: 'Why' }],
    }),
  },
  {
    name: 'slideTitle eyebrow',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: 'x',
    max: 3000,
    node: (fill) => ({
      type: 'slideTitle',
      title: 'Ledger',
      eyebrow: `Launch ${fill}`,
    }),
  },
  {
    name: 'slideTerritoryGroup toned title',
    slot: 'fields',
    limit: SLACK_LIMITS.sectionFieldChars,
    filler: 'x',
    max: 3000,
    node: (fill) => ({
      type: 'slideTerritoryGroup',
      items: [
        { title: `Ours ${fill}`, body: 'We run it', tone: 'primary' },
        { title: 'Theirs', body: 'They run it', tone: 'accent' },
      ],
    }),
  },
  {
    name: 'slideSplit toned label',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: '&',
    max: 3000,
    node: (fill) => ({
      type: 'slideSplit',
      panes: [
        {
          label: fill,
          tone: 'primary',
          items: [{ type: 'slideBulletList', items: ['One'] }],
        },
        { items: [{ type: 'slideBulletList', items: ['Two'] }] },
      ],
    }),
  },
  {
    name: 'slideBulletList label',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: '&',
    max: 3000,
    node: (fill) => ({
      type: 'slideBulletList',
      label: fill,
      items: ['One'],
    }),
  },
  {
    name: 'slideCode file',
    slot: 'section',
    limit: SLACK_LIMITS.sectionTextChars,
    filler: 'x',
    max: 4000,
    node: (fill) => ({
      type: 'slideCode',
      panels: [{ file: `order ${fill}`, lines: ['{}'] }],
    }),
  },
  {
    name: 'slideTable label',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: '&',
    max: 3000,
    node: (fill) => ({
      type: 'slideTable',
      label: fill,
      columns: ['Region'],
      rows: [['Europe']],
    }),
  },
  {
    name: 'slideQuadrant label',
    slot: 'fields',
    limit: SLACK_LIMITS.sectionFieldChars,
    filler: 'x',
    max: 3000,
    node: (fill) => ({
      type: 'slideQuadrant',
      x: { low: 'Easy', high: 'Hard' },
      y: { low: 'Minor', high: 'Major' },
      quadrants: [
        { label: `Wins ${fill}`, items: ['dark mode'] },
        { label: 'Big bets', items: [] },
        { label: 'Fill-ins', items: [] },
        { label: 'Money pits', items: [] },
      ],
    }),
  },
  {
    name: 'slideQuadrant axis',
    slot: 'context',
    limit: SLACK_LIMITS.contextElementChars,
    filler: '&',
    max: 3000,
    node: (fill) => ({
      type: 'slideQuadrant',
      x: { low: fill, high: 'Hard' },
      y: { low: 'Minor', high: 'Major' },
      quadrants: [
        { label: 'Quick wins', items: ['dark mode'] },
        { label: 'Big bets', items: [] },
        { label: 'Fill-ins', items: [] },
        { label: 'Money pits', items: [] },
      ],
    }),
  },
];

const schemas = new Map<string, (typeof slideDeckPrimitives)[number]['schema']>(
  slideDeckPrimitives.map(({ type, schema }) => [type, schema])
);

const printed = (filler: LimitCase['filler'], length: number) =>
  filler === '&' ? '&amp;'.repeat(length) : long(length);

const slotTexts = (block: SlackBlock, slot: Slot): string[] => {
  if (slot === 'fields') {
    return block.type === 'section'
      ? (block.fields ?? []).map(({ text }) => text)
      : [];
  }
  if (block.type !== slot) {
    return [];
  }
  if (block.type === 'context') {
    return block.elements.flatMap((element) =>
      'text' in element && typeof element.text === 'string'
        ? [element.text]
        : []
    );
  }
  return 'text' in block && block.text ? [block.text.text] : [];
};

const render = (node: PrimitiveNode) =>
  runtime.surfaces.slack.renderNode(node).blocks;

/** The slot's text, when a block of the slot's kind prints `length` fillers whole. */
const fitting = (
  { slot, filler, node }: LimitCase,
  length: number
): string | undefined =>
  render(node(long(length, filler)))
    .flatMap((block) => slotTexts(block, slot))
    .find((text) => text.includes(printed(filler, length)));

const richText = (blocks: SlackBlock[]): string =>
  JSON.stringify(blocks.filter(({ type }) => type === 'rich_text'));

describe('Slack slots below their schema cap', () => {
  it.each(cases)(
    '$name keeps its text whole at the limit and past it',
    (row) => {
      let low = 0;
      let high = row.max;
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (fitting(row, mid) !== undefined) {
          low = mid;
        } else {
          high = mid - 1;
        }
      }
      const last = fitting(row, low);
      expect(last).toBeDefined();
      expect(last?.length).toBeLessThanOrEqual(row.limit);
      expect(last?.length).toBeGreaterThan(
        row.limit - (row.filler === '&' ? '&amp;'.length : 1)
      );
      expect(low).toBeLessThan(row.max);

      const over = row.node(long(low + 1, row.filler));
      expect(schemas.get(over.type)?.safeParse(over).success ?? true).toBe(
        true
      );
      expect(fitting(row, low + 1)).toBeUndefined();
      expect(richText(render(over))).toContain(long(low + 1, row.filler));
    }
  );
});
