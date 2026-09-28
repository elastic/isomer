/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { stripMarks } from '../../render/marks';

import { example, examples, outwardEdgesExample } from './examples';
import { markdown, text } from './index';
import { graphLayout } from './layout';
import { schema, type SlideGraphNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

const authored = ({ nodes, caption }: SlideGraphNode): string[] =>
  [caption, ...nodes.flatMap(({ term, body }) => [term, body])].filter(
    (value): value is string => value !== undefined
  );

const messages = (value: unknown): string[] =>
  schema.safeParse(value).error?.issues.map(({ message }) => message) ?? [];

const SUPPORTED = /supports one left-to-right main row of 2–4 nodes/;

describe('slideGraph', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

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
      edges: [...example.edges, ['order', 'refund']],
    });
    expect(message).toMatch(/unknown node "refund"/);
    expect(message).toMatch(SUPPORTED);
  });

  it('rejects edges the template cannot draw', () => {
    for (const edges of [
      // Skips a main-row node.
      [...example.edges, ['catalog', 'order']],
      // Runs right to left.
      [
        ['basket', 'catalog'],
        ...example.edges.filter(([from]) => from !== 'catalog'),
      ],
      // Joins the two off-row nodes.
      [...example.edges, ['pricing', 'stock']],
      // Attaches the node above twice.
      [...example.edges, ['pricing', 'basket']],
    ]) {
      const found = messages({ ...example, edges });
      expect(found.length, JSON.stringify(edges)).toBeGreaterThan(0);
      expect(found.every((message) => SUPPORTED.test(message))).toBe(true);
    }
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

  it('rejects unsupported shapes: too many main-row or placed nodes, duplicate ids', () => {
    const [first] = example.nodes;
    expect(
      messages({
        ...example,
        nodes: [...example.nodes, { ...first, id: 'extra' }],
      }).some((message) => /main row has 5 nodes/.test(message))
    ).toBe(true);
    expect(
      messages({
        ...example,
        nodes: example.nodes.map((node) =>
          node.id === 'stock' ? { ...node, placement: 'above' } : node
        ),
      }).some((message) => /more than one node is placed above/.test(message))
    ).toBe(true);
    expect(
      messages({
        ...example,
        nodes: [...example.nodes.slice(0, 5), { ...first }],
      }).some((message) => /duplicate node id "catalog"/.test(message))
    ).toBe(true);
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

  it('keeps every authored string on every degraded surface', () => {
    for (const node of examples) {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.replace(/[`*]/g, '').toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  });
});
