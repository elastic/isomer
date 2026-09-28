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
import { splitFit } from '../../theme/components/split';
import { slideDistillery } from '../../theme/distillery';
import { sizeForLoad } from '../size';
import { example as codeExample } from '../slide_code/examples';
import { authoredStrings, slackText } from '../test_helpers.fixtures';

import { arrowExample, example, examples, mixedExample } from './examples';
import { splitLoad } from './fit';
import { slideSplitPrimitive } from './index';
import { schema } from './schema';
import type { SlideSplitNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const authored = authoredStrings([
  'type',
  'tone',
  'ratio',
  'divider',
  'language',
  'role',
  'format',
]);

describe('slideSplit schema', () => {
  it('holds one to six items a side', () => {
    expect(schema.safeParse({ ...example, left: { items: [] } }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, left: { items: Array(7).fill('x') } })
        .success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('reports an invalid node item at its index', () => {
    const { errors } = runtime.validate(
      compose({
        ...mixedExample,
        right: {
          items: ['One nightly run', { type: 'slideCode', panels: [] }],
        },
      } as PrimitiveNode)
    );
    expect(errors.map(({ path }) => path)).toContainEqual(
      expect.stringMatching(/^body\[0\]\.body\[0\]\.right\.items\[1\]/)
    );
  });
});

describe('slideSplit children', () => {
  it('yields node items at their index in items, skipping strings', () => {
    expect(
      slideSplitPrimitive.children?.(mixedExample).map(({ path }) => path)
    ).toEqual(['right.items[1]']);
  });

  it('has its own content when it carries a string, label, or footnote', () => {
    const nodesOnly: SlideSplitNode = {
      type: 'slideSplit',
      left: { items: [codeExample] },
      right: { items: [codeExample] },
    };
    expect(slideSplitPrimitive.hasOwnContent?.(nodesOnly)).toBe(false);
    expect(slideSplitPrimitive.hasOwnContent?.(example)).toBe(true);
  });
});

describe('slideSplit output', () => {
  it('keeps an arrow divider between the sides on every text surface', () => {
    const arrow = slideDistillery.tokens.split.arrowGlyph.value;
    const composition = compose(arrowExample);
    const { blocks } = runtime.surfaces.slack.render(composition);
    for (const output of [
      runtime.surfaces.text.render(composition),
      runtime.surfaces.markdown.render(composition),
    ]) {
      expect(output).toContain(`\n\n${arrow}\n\n`);
    }
    expect(blocks).toContainEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: arrow },
    });
    expect(runtime.surfaces.text.render(compose(example))).not.toContain(arrow);
  });

  it('lists each side under its label in text', () => {
    expect(runtime.surfaces.text.renderNode(example)).toMatchInlineSnapshot(`
      "Payments team
      - Card capture
      - Fraud scoring
      - Settlement
      - Refunds

      Merchant
      - Prices
      - Stock
      - Shipping
      - Customer support

      Because the line is fixed, a merchant can change prices without a payments release."
    `);
  });

  it('renders markdown headings and bullets, and nodes as themselves', () => {
    expect(runtime.surfaces.markdown.renderNode(mixedExample))
      .toMatchInlineSnapshot(`
        "## Before

        - Five batch windows
        - Manual retries

        ## After

        - One nightly run

        **refund.ts**

        \`\`\`ts
        export const refund = async (order: Order) => {
          await ledger.write(order.id, -order.total);
          await fraud.check(order);
          return notify(order.customer);
        };
        \`\`\`"
      `);
  });

  it('renders Slack sections, and nodes through their own renderer', () => {
    expect(runtime.surfaces.slack.render(compose(mixedExample)).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*Before*
      • Five batch windows
      • Manual retries",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": " ",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "*After*
      • One nightly run",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": " ",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "refund.ts
      \`\`\`
      export const refund = async (order: Order) => {
        await ledger.write(order.id, -order.total);
        await fraud.check(order);
        return notify(order.customer);
      };
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ];
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output.replace(/[`*]/g, '').toLowerCase()).toContain(
            stripMarks(value).toLowerCase()
          );
        }
      }
    }
  );
});

describe('slideSplit size', () => {
  const step = (node: SlideSplitNode) =>
    sizeForLoad(node.size, splitLoad(node), splitFit);

  it('keeps short statements at the largest step', () => {
    expect(step(example)).toBe('l');
  });

  it('steps down for long statements, and more for a narrow column', () => {
    const long = 'East-coast parcels spend fewer days in transit';
    const busy: SlideSplitNode = {
      ...example,
      divider: 'gap',
      left: { items: [long, long, long] },
      right: { items: [long, long, long] },
    };
    expect(step(busy)).toBe('m');
    expect(
      step({ ...busy, ratio: 'aside', right: { items: [long, long, long] } })
    ).toBe('s');
    expect(step({ ...busy, size: 'l' })).toBe('l');
  });

  it('counts the columns a wider divider takes away', () => {
    const long = 'East-coast parcels spend fewer days in transit';
    const node: SlideSplitNode = {
      ...example,
      left: { items: [long, long] },
      right: { items: [long, long] },
    };
    const load = (divider: NonNullable<SlideSplitNode['divider']>) =>
      splitLoad({ ...node, divider });
    expect(load('rule')).toBeGreaterThan(load('gap'));
    expect(load('hairline')).toBeGreaterThan(load('gap'));
    expect(load('rule')).toBeGreaterThan(load('hairline'));
  });
});
