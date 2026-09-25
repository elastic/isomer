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

import { example, examples } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

describe('slideFanout', () => {
  it('holds two to six targets', () => {
    const [first] = example.targets;
    expect(schema.safeParse({ ...example, targets: [first] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, targets: Array(7).fill(first) }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "OrderPlaced →
        picking: Sends the list to the nearest store
        payments: Holds the amount on the card
        email: Confirms the order to the customer
        courier: Books a delivery window"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "**OrderPlaced** →

      - picking: Sends the list to the nearest store
      - payments: Holds the amount on the card
      - email: Confirms the order to the customer
      - courier: Books a delivery window"
    `);
  });

  it('renders a Slack list', () => {
    expect(runtime.surfaces.slack.render(compose(example)).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*OrderPlaced* →
      • *picking*: Sends the list to the nearest store
      • *payments*: Holds the amount on the card
      • *email*: Confirms the order to the customer
      • *courier*: Books a delivery window",
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
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      const authored = [
        node.source,
        ...node.targets.flatMap(({ name, body }) => [name, body]),
      ];
      for (const value of authored) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  );
});
