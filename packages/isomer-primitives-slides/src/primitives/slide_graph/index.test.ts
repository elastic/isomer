/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { SLACK_LIMITS } from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { frameContentWidth } from '../../theme/components/frame';
import { graph, graphFit, graphMaxMain } from '../../theme/components/graph';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { measureText } from '../size';
import { layoutContext, renderedStep, shortWords } from '../size.fixtures';

import { example, outwardEdgesExample, pairExample } from './examples';
import { graphCaptionWidth, graphLoad, graphStep, graphWordStep } from './fit';
import { markdown as markdownContent, slack, text } from './index';
import { graphLayout } from './layout';
import { graphEdges, schema, type SlideGraphNode } from './schema';

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
  it('resolves the fixed template, including arrow direction', () => {
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

  it('derives each arrow: the main row left to right, then each placed node', () => {
    expect(graphEdges(example)).toEqual([
      ['catalog', 'basket'],
      ['basket', 'order'],
      ['order', 'delivery'],
      ['pricing', 'order'],
      ['stock', 'order'],
    ]);
    expect(graphEdges(outwardEdgesExample)).toEqual([
      ['commit', 'build'],
      ['build', 'release'],
      ['policy', 'commit'],
      ['release', 'changelog'],
    ]);
  });

  it('rejects an `of` that names no main-row node, and names the supported shape', () => {
    const placed = (of: string) =>
      messages({
        ...example,
        nodes: example.nodes.map((node) =>
          node.id === 'stock' ? { ...node, of } : node
        ),
      });
    const [unknown] = placed('refund');
    expect(unknown).toMatch(
      /"stock" names "refund" in `of`, not a main-row node/
    );
    expect(unknown).toMatch(SUPPORTED);
    expect(placed('pricing')).toEqual([
      expect.stringMatching(/"stock" names "pricing" in `of`/),
    ]);
  });

  it('needs `of` on a placed node and refuses it, and `direction`, on the main row', () => {
    expect(
      messages({
        ...example,
        nodes: example.nodes.map(({ of: _of, ...node }) => node),
      })
    ).toEqual([
      expect.stringMatching(/the above node "pricing" needs `of`/),
      expect.stringMatching(/the below node "stock" needs `of`/),
    ]);
    expect(
      schema
        .safeParse({
          ...pairExample,
          nodes: pairExample.nodes.map((node, index) =>
            index === 0 ? { ...node, of: 'review', direction: 'out' } : node
          ),
        })
        .error?.issues.map(({ message, path }) => [path, message])
    ).toEqual([
      [['nodes', 0, 'of'], expect.stringMatching(/"incident" takes no `of`/)],
      [
        ['nodes', 0, 'direction'],
        expect.stringMatching(/"incident" takes no `direction`/),
      ],
    ]);
  });

  it('takes one emphasized node and rejects a second', () => {
    expect(messages(pairExample)).toEqual([]);
    expect(
      messages({
        ...pairExample,
        nodes: pairExample.nodes.map((node) => ({ ...node, emphasis: true })),
      })
    ).toEqual([expect.stringMatching(/more than one node is emphasized/)]);
    expect(
      schema.safeParse({
        ...pairExample,
        nodes: pairExample.nodes.map((node) => ({ ...node, emphasis: true })),
      }).error?.issues[0]?.path
    ).toEqual(['nodes', 1, 'emphasis']);
  });

  it('holds two to six nodes, two to four in the main row', () => {
    const [first] = example.nodes;
    expect(messages({ ...pairExample, nodes: [first] })).toContainEqual(
      expect.stringMatching(/Too small/)
    );
    expect(
      messages({
        ...pairExample,
        nodes: [
          pairExample.nodes[0],
          { ...pairExample.nodes[1], placement: 'above' },
        ],
      })
    ).toContainEqual(expect.stringMatching(/main row has 1 nodes/));
    expect(
      messages({
        ...example,
        nodes: [...example.nodes, { ...first, id: 'extra' }],
      })
    ).toEqual([expect.stringMatching(/Too big/)]);
  });

  it('pins `example` at the most nodes the layout takes', () => {
    // The fit test measures it as the densest graph.
    const { main, above, below } = graphLayout(example);
    expect(main).toHaveLength(graphMaxMain);
    expect(above).toBeDefined();
    expect(below).toBeDefined();
    expect(messages(example)).toEqual([]);
  });

  it('skips the layout rules once nodes are over their cap', () => {
    const nodes = Array.from({ length: 10_000 }, (_, index) => ({
      id: `n${index}`,
      term: 'T',
      body: 'B',
    }));
    expect(messages({ ...example, nodes })).toEqual([
      expect.stringMatching(/Too big/),
    ]);
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

  it('names every arrow and the emphasis cue for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(
      [...html.matchAll(/role="img" aria-label="([^"]+)"/g)].map(
        ([, label]) => label
      )
    ).toEqual([
      'Pricing leads to Order',
      'Catalog leads to Basket',
      'Basket leads to Order',
      'Focus',
      'Order leads to Delivery',
      'Stock leads to Order',
    ]);
    const outward = runtime.surfaces.html.render(
      compose(outwardEdgesExample)
    ).html;
    expect(outward).toContain('aria-label="Release leads to Changelog"');
  });

  it('renders a glossary, then the arrows', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "A basket becomes an order once pricing and stock agree.

      Catalog: Every product a store can sell.
      Basket: What a customer means to buy.
      ● Order: A priced basket with a slot.
      Delivery: One van run, many orders.
      Pricing: Offers, fixed at checkout.
      Stock: What the store holds now.

      Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "A basket becomes an order once **pricing and stock** agree.

      - **Catalog**: Every product a store can sell.
      - **Basket**: What a customer means to buy.
      - ● **Order**: A priced basket with a slot.
      - **Delivery**: One van run, many orders.
      - **Pricing**: Offers, fixed at checkout.
      - **Stock**: What the store holds now.

      Catalog → Basket, Basket → Order, Order → Delivery, Pricing → Order, Stock → Order"
    `);
  });

  it('keeps a relations line past the context limit whole as rich text', () => {
    const term = 'x'.repeat(SLACK_LIMITS.contextElementChars);
    const [, relations] = slack({
      ...pairExample,
      nodes: pairExample.nodes.map((node, index) =>
        index === 0 ? { ...node, term } : node
      ),
    });
    expect(relations?.type).toBe('rich_text');
    expect(JSON.stringify(relations)).toContain(`${term} → Review`);
  });

  it('renders Slack as a native list, then the arrows', () => {
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
                      "text": "Incident",
                      "type": "text",
                    },
                    {
                      "text": ": ",
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
                      "text": "● ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Review",
                      "type": "text",
                    },
                    {
                      "text": ": ",
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
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });

  const pair = (load: number): SlideGraphNode => ({
    type: 'slideGraph',
    nodes: [
      { id: 'a', term: 'A', body: shortWords(load - 1) },
      { id: 'b', term: 'B', body: 'y' },
    ],
  });

  it('loads node rows times the longest node, plus the caption', () => {
    expect(graphLoad(pair(40))).toBe(40);
    expect(graphLoad(example)).toBe(
      3 * 'CatalogEvery product a store can sell.'.length +
        'A basket becomes an order once pricing and stock agree.'.length
    );
  });

  it('steps down until its widest term word fits its node', () => {
    const word = 'Substitutions';
    const node: SlideGraphNode = {
      ...pairExample,
      nodes: [
        { id: 'a', term: word, body: 'x' },
        { id: 'b', term: 'B', body: 'y' },
      ],
    };
    const inset =
      2 * (scalePx(graph.node.paddingX.l) + scalePx(graph.node.emphasisBorder));
    const layoutWidth = (step: SlideSize, over: number) =>
      2 *
        (measureText(word, { ...graph.term, size: graph.termSizes[step] })
          .widest +
          over +
          inset) +
      scalePx(graph.track);
    expect(graphWordStep(node, layoutWidth('l', 1))).toBe('l');
    expect(graphWordStep(node, layoutWidth('l', -1))).toBe('m');
    expect(graphWordStep(node, layoutWidth('s', 1))).toBe('s');
    expect(
      graphStep(node, layoutContext({ width: layoutWidth('m', -1) }))
    ).toBe('s');
    expect(
      graphStep(
        { ...node, size: 'l' },
        layoutContext({ width: layoutWidth('s', -1) })
      )
    ).toBe('l');
  });

  it('measures the caption at each step in the tracks beside the upper node', () => {
    const word = 'Reconciliation';
    const node: SlideGraphNode = {
      type: 'slideGraph',
      caption: `The ${word} runs nightly.`,
      nodes: [
        { id: 'a', term: 'A', body: 'x' },
        { id: 'b', term: 'B', body: 'x' },
        { id: 'c', term: 'C', body: 'x' },
        { id: 'd', term: 'D', body: 'x', placement: 'above', of: 'b' },
      ],
    };
    const widest = (step: SlideSize) =>
      measureText(word, { ...graph.caption, size: graph.captionSizes[step] })
        .widest;
    const track = widest('l') - 1;
    const width = 3 * track + 2 * scalePx(graph.track);
    expect(graphCaptionWidth(node, width)).toBeCloseTo(track);
    expect(graphWordStep(node, width)).toBe('m');
    expect(
      graphWordStep(
        {
          ...node,
          nodes: node.nodes.slice(0, 3),
        },
        width
      )
    ).toBe('l');
    expect(graphCaptionWidth(example, frameContentWidth)).toBe(
      scalePx(graph.captionMaxWidth)
    );
  });

  it('takes the whole body on a slide with no heading', () => {
    const node = pair(graphFit.l + 1);
    expect(graphStep(node, layoutContext())).toBe('m');
    expect(graphStep(node, undefined)).toBe('l');
    expect(renderedStep('graph-termSize', node)).toBe('l');
  });

  it('steps down at each budget, under crowding, and in a narrower box, unless sized', () => {
    const edge = (load: number) => graphStep(pair(load), layoutContext());
    expect(edge(graphFit.l)).toBe('l');
    expect(edge(graphFit.l + 1)).toBe('m');
    expect(edge(graphFit.m)).toBe('m');
    expect(edge(graphFit.m + 1)).toBe('s');
    expect(graphStep(pair(graphFit.l), layoutContext({ crowding: 1.1 }))).toBe(
      'm'
    );
    expect(
      graphStep(
        pair(graphFit.l),
        layoutContext({ width: frameContentWidth * 0.95 })
      )
    ).toBe('m');
    expect(
      graphStep(
        { ...pair(graphFit.m + 1), size: 'l' },
        layoutContext({ crowding: 3 })
      )
    ).toBe('l');
  });
});
