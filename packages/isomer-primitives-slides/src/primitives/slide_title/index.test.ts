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
import type { SlideTitleNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [
    { type: 'slideFrame', tone: 'inverse', body: [node] } as PrimitiveNode,
  ],
});

const authored = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(authored);
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      key === 'type' ? [] : authored(entry)
    );
  }
  return [];
};

describe('slideTitle', () => {
  it('validates every example inside an inverse frame', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects an aside that is not a slide node', () => {
    const { errors } = runtime.validate(
      compose({ ...example, aside: { type: 'nope' } } as PrimitiveNode)
    );
    expect(errors).not.toEqual([]);
  });

  it('rejects the retired fields', () => {
    const { errors } = runtime.validate(
      compose({ type: 'slideTitle', title: 'T', lede: 'L' } as PrimitiveNode)
    );
    expect(errors).not.toEqual([]);
  });

  it('renders its own lines, then the aside', () => {
    const composition = compose(example);
    expect(runtime.surfaces.text.render(composition)).toMatchInlineSnapshot(`
      "A GROCERY DELIVERY PLATFORM
      Crate
      One order. Every store.
      crate n. Everything a customer means to buy, carried from whichever store can fill it.

      OrderPlaced →
        picking: Sends the list to the nearest store
        payments: Holds the amount on the card
        email: Confirms the order to the customer
        courier: Books a delivery window"
    `);
    expect(runtime.surfaces.markdown.render(composition))
      .toMatchInlineSnapshot(`
        "# Crate

        _A grocery delivery platform_

        One order. Every store.

        _crate n._ Everything a customer means to buy, carried from whichever store can fill it.

        **OrderPlaced** →

        - picking: Sends the list to the nearest store
        - payments: Holds the amount on the card
        - email: Confirms the order to the customer
        - courier: Books a delivery window"
      `);
    expect(runtime.surfaces.slack.render(composition).blocks)
      .toMatchInlineSnapshot(`
        [
          {
            "text": {
              "emoji": true,
              "text": "Crate",
              "type": "plain_text",
            },
            "type": "header",
          },
          {
            "elements": [
              {
                "text": "*A grocery delivery platform*",
                "type": "mrkdwn",
              },
            ],
            "type": "context",
          },
          {
            "text": {
              "text": "One order. Every store.",
              "type": "mrkdwn",
            },
            "type": "section",
          },
          {
            "elements": [
              {
                "text": "_crate n._ Everything a customer means to buy, carried from whichever store can fill it.",
                "type": "mrkdwn",
              },
            ],
            "type": "context",
          },
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
    (_index, node: SlideTitleNode) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        JSON.stringify(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  );
});
