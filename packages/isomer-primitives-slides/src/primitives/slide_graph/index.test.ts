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

import { example, outwardEdgesExample, pairExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { graphLayout } from './layout';
import { schema, type SlideGraphNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: SlideGraphNode): string =>
  serializeMarkdown(markdownContent(node));

const messages = (value: unknown): string[] =>
  schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

const SUPPORTED = /supports one left-to-right main row of 2–4 nodes/;

describe('slideGraph', () => {
  it('resolves the fixed template, including edge direction', () => {
    const { main, above, below } = graphLayout(example);
    expect(main.map(({ id }) => id)).toEqual([
      'catalog',
      'basket',
      'order',
      'delivery',
    ]);
    expect(above).toMatchObject({ at: 2, inward: true });
    expect(below).toMatchObject({ at: 2, inward: true });
    expect(graphLayout(outwardEdgesExample)).toMatchObject({
      above: { at: 0, inward: true },
      below: { at: 2, inward: false },
    });
  });

  it('rejects unknown ids and names the supported shape', () => {
    const [message] = messages({
      ...example,
      edges: [...example.edges.slice(0, 4), ['order', 'refund']],
    });
    expect(message).toMatch(/unknown node "refund"/);
    expect(message).toMatch(SUPPORTED);
  });

  it.each([
    ['skips a main-row node', [['catalog', 'order']]],
    ['joins the two off-row nodes', [['pricing', 'stock']]],
    ['attaches the node above twice', [['pricing', 'basket']]],
  ] as const)('rejects an edge that %s', (_name, extra) => {
    const found = messages({
      ...example,
      edges: [...example.edges.slice(0, 4), ...extra],
    });
    expect(found.length).toBeGreaterThan(0);
    expect(found.every((message) => SUPPORTED.test(message))).toBe(true);
  });

  it('rejects a main-row edge that runs right to left', () => {
    expect(
      messages({
        ...pairExample,
        edges: [['review', 'incident']],
      })
    ).toEqual([
      expect.stringMatching(/does not fit the layout/),
      expect.stringMatching(/missing main-row edge \[incident, review\]/),
    ]);
  });

  it('rejects a missing main-row edge and an unattached off-row node', () => {
    expect(
      messages({
        ...example,
        edges: example.edges.filter(
          ([from, to]) => !(from === 'basket' && to === 'order')
        ),
      })
    ).toEqual([
      expect.stringMatching(/missing main-row edge \[basket, order\]/),
    ]);
    expect(
      messages({
        ...example,
        edges: example.edges.filter(([from]) => from !== 'stock'),
      })
    ).toEqual([expect.stringMatching(/"stock" needs exactly one edge/)]);
  });

  it('rejects too many main-row or placed nodes, and duplicate ids', () => {
    const [first] = example.nodes;
    expect(
      messages({
        ...example,
        nodes: [...example.nodes.slice(0, 5), { ...first, id: 'extra' }],
      })
    ).toContainEqual(expect.stringMatching(/main row has 5 nodes/));
    expect(
      messages({
        ...example,
        nodes: example.nodes.map((node) =>
          node.id === 'stock' ? { ...node, placement: 'above' } : node
        ),
      })
    ).toContainEqual(
      expect.stringMatching(/more than one node is placed above/)
    );
    expect(
      messages({
        ...example,
        nodes: [...example.nodes.slice(0, 5), { ...first }],
      })
    ).toContainEqual(expect.stringMatching(/duplicate node id "catalog"/));
  });

  it('names every arrow for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(
      [...html.matchAll(/role="img" aria-label="([^"]+)"/g)].map(
        ([, label]) => label
      )
    ).toEqual([
      'Pricing leads to Order',
      'Catalog leads to Basket',
      'Basket leads to Order',
      'Order leads to Delivery',
      'Stock leads to Order',
    ]);
    const outward = runtime.surfaces.html.render(
      compose(outwardEdgesExample)
    ).html;
    expect(outward).toContain('aria-label="Release leads to Changelog"');
  });

  it('renders a glossary, then the edges', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "A basket becomes an order once pricing and stock agree.

      Catalog: Every product a store can sell.
      Basket: What a customer means to buy.
      Order: A priced basket with a slot.
      Delivery: One van run, many orders.
      Pricing: Offers, fixed at checkout.
      Stock: What the store holds now.

      Catalog → Basket
      Basket → Order
      Order → Delivery
      Pricing → Order
      Stock → Order"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "A basket becomes an order once **pricing and stock** agree.

      - **Catalog:** Every product a store can sell.
      - **Basket:** What a customer means to buy.
      - **Order:** A priced basket with a slot.
      - **Delivery:** One van run, many orders.
      - **Pricing:** Offers, fixed at checkout.
      - **Stock:** What the store holds now.

      Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order"
    `);
  });

  it('renders Slack as a native list, then the edges', () => {
    expect(slack(pairExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "text": "Every incident ends in a review, whatever its size.",
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
                      "text": "Incident:",
                      "type": "text",
                    },
                    {
                      "text": " ",
                      "type": "text",
                    },
                    {
                      "text": "Something customers noticed, with a start and an end.",
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
                      "text": "Review:",
                      "type": "text",
                    },
                    {
                      "text": " ",
                      "type": "text",
                    },
                    {
                      "text": "A blameless write-up with owners for each ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "follow-up",
                      "type": "text",
                    },
                    {
                      "text": ".",
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
              "text": "Incident → Review",
              "type": "plain_text",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });
});
