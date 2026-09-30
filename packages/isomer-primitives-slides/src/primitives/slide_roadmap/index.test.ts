/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { frameContentWidth } from '../../theme/components/frame';
import { roadmap, roadmapFit } from '../../theme/components/roadmap';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { measureText } from '../size';
import { layoutAt, renderedStep, shortWords } from '../size.fixtures';

import { example, fullExample, twoColumnsExample } from './examples';
import { roadmapLoad, roadmapStep, roadmapWordStep } from './fit';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideRoadmapNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: SlideRoadmapNode): string =>
  serializeMarkdown(markdownContent(node));

describe('slideRoadmap', () => {
  it('holds two to four columns of one to four items', () => {
    const [column] = example.columns;
    // The fit test measures `fullExample` as the most columns and items a roadmap takes.
    expect(fullExample.columns).toHaveLength(4);
    expect(fullExample.columns.every(({ items }) => items.length === 4)).toBe(
      true
    );
    expect(schema.safeParse(fullExample).success).toBe(true);
    expect(schema.safeParse({ ...example, columns: [column] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, columns: Array(5).fill(column) }).success
    ).toBe(false);
    expect(schema.safeParse(twoColumnsExample).success).toBe(true);
    const [left, right] = twoColumnsExample.columns;
    const items = (count: number) =>
      schema.safeParse({
        ...twoColumnsExample,
        columns: [{ ...left, items: Array(count).fill(left?.items[0]) }, right],
      }).success;
    expect(items(0)).toBe(false);
    expect(items(1)).toBe(true);
    expect(items(4)).toBe(true);
    expect(items(5)).toBe(false);
  });

  it('rejects more than one current column', () => {
    const [first, second, ...rest] = example.columns;
    const { errors } = runtime.validate(
      compose({
        ...example,
        columns: [
          { ...first, current: true },
          { ...second, current: true },
          ...rest,
        ],
      })
    );
    expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
      'body[0].body[0].columns: at most one column can be current',
    ]);
  });

  it('skips the current rule once columns are over their cap', () => {
    const [column] = example.columns;
    const columns = Array(10_000).fill({ ...column, current: true });
    expect(
      schema
        .safeParse({ ...example, columns })
        .error?.issues.map(({ path }) => path)
    ).toEqual([['columns']]);
  });

  it('keeps a space between an item title and its body in the HTML text', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    const [item] = example.columns[0]?.items ?? [];
    expect(html.replace(/<[^>]+>/g, '')).toContain(
      `${item?.title} ${item?.body}`
    );
  });

  it('marks the current column for assistive technology and with a cue', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.match(/aria-current="step"/g)).toHaveLength(1);
    expect(html.match(/role="img" aria-label="Current"/g)).toHaveLength(1);
  });

  it('renders text and markdown with the current column marked', () => {
    expect(text(twoColumnsExample)).toMatchInlineSnapshot(`
      "This half · COMMITTED
      - Faster payouts: Merchants are paid the next business day
      - Dispute inbox: Every chargeback in one queue

      Next half · EXPLORING
      - Instant payouts: Paid within minutes, for a small fee"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "## ● Now · SHIPPED

      - **Saved baskets**: Reorder last week’s shop in one tap
      - **Card on file**: Checkout without retyping a card

      ## Next · IN BUILD

      - **Substitutions**: Approve a swap from a message
      - **Delivery slots**: Pick a one-hour window
      - **Receipts**: Itemized, in the app and by \`email\`

      ## Later · PROPOSED

      - **Shared lists**: One basket for the whole household
      - **Price alerts**: A nudge when a staple goes on sale
      - **Pantry**: Suggest what is running low
      - **Recipes**: Add every ingredient in one step"
    `);
  });

  it('renders Slack as a bold horizon over a list, per column', () => {
    expect(slack(twoColumnsExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "This half · COMMITTED",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Faster payouts",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Merchants are paid the next business day",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Dispute inbox",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Every chargeback in one queue",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "Next half · EXPLORING",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Instant",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": " payouts",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Paid within minutes, for a small fee",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });

  const twoColumns = (load: number): SlideRoadmapNode => ({
    type: 'slideRoadmap',
    columns: ['A', 'B'].map((title) => ({
      title,
      status: 'S',
      items: [{ title: 'I', body: shortWords(Math.ceil(load / 2) - 3) }],
    })),
  });

  it('loads the longest column times the column count', () => {
    expect(roadmapLoad(twoColumns(400))).toBe(400);
  });

  it('loads a status as it prints, uppercase', () => {
    const withStatus = (status: string) => ({
      ...twoColumns(400),
      columns: twoColumns(400).columns.map((column) => ({ ...column, status })),
    });
    expect(roadmapLoad(withStatus('ßßßß'))).toBe(
      roadmapLoad(withStatus('SSSSSSSS'))
    );
  });

  it('steps down until its widest horizon word fits its column', () => {
    const title = 'Afterwards';
    const node: SlideRoadmapNode = {
      ...twoColumnsExample,
      columns: twoColumnsExample.columns.map((column) => ({
        ...column,
        title,
        items: [{ title: 'I', body: 'x' }],
      })),
    };
    const gutter = 2 * scalePx(roadmap.columnPadding) + scalePx(roadmap.rule);
    const layoutWidth = (step: SlideSize, over: number) =>
      2 *
        (measureText(title, {
          ...roadmap.title,
          size: roadmap.titleSizes[step],
        }).widest +
          over) +
      gutter;
    expect(roadmapWordStep(node, layoutWidth('l', 1))).toBe('l');
    expect(roadmapWordStep(node, layoutWidth('l', -1))).toBe('m');
    expect(roadmapWordStep(node, layoutWidth('m', -1))).toBe('s');
    expect(roadmapStep(node, layoutAt(1, layoutWidth('m', -1)))).toBe('s');
    expect(
      roadmapStep({ ...node, size: 'l' }, layoutAt(1, layoutWidth('s', -1)))
    ).toBe('l');
  });

  it('takes the whole body on a slide with no heading', () => {
    const node = twoColumns(roadmapFit.l + 2);
    expect(roadmapStep(node, layoutAt(1))).toBe('m');
    expect(roadmapStep(node, undefined)).toBe('l');
    expect(renderedStep('roadmap-titleSize', node)).toBe('l');
  });

  it('steps down at each budget, under crowding, and in a narrower box, unless sized', () => {
    const edge = (load: number) => roadmapStep(twoColumns(load), layoutAt(1));
    expect(edge(roadmapFit.l)).toBe('l');
    expect(edge(roadmapFit.l + 2)).toBe('m');
    expect(edge(roadmapFit.m)).toBe('m');
    expect(edge(roadmapFit.m + 2)).toBe('s');
    expect(roadmapStep(twoColumns(roadmapFit.l), layoutAt(1.1))).toBe('m');
    expect(
      roadmapStep(
        twoColumns(roadmapFit.l),
        layoutAt(1, frameContentWidth * 0.95)
      )
    ).toBe('m');
    expect(
      roadmapStep({ ...twoColumns(roadmapFit.m + 2), size: 'l' }, layoutAt(3))
    ).toBe('l');
  });
});
