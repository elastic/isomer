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

import { example, pendingExample } from './examples';
import { markdown as markdownContent, text } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: object) =>
  runtime.validate(compose(node)).errors.map(({ path }) => path);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideStats', () => {
  it('holds two to four numbers, each unit with a value', () => {
    const [first] = example.items;
    expect(errorPaths({ ...example, items: [first] })).toMatchInlineSnapshot(`
      [
        "body[0].body[0].items",
      ]
    `);
    expect(errorPaths({ ...example, items: [...example.items, first, first] }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].items",
      ]
    `);
    expect(
      errorPaths({
        ...example,
        items: [{ ...first, value: undefined, unit: 'ms' }, first],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].items[0].unit",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "3 Regions: Checkout now runs active-active in each of them.
      40 ms p99 latency: Measured at the edge during the spring sale peak.
      0 Failed payments: Across two regional failovers in the same week."
    `);
    expect(markdown(pendingExample)).toMatchInlineSnapshot(`
      "- _value pending_ On time: Orders delivered inside the booked slot.
      - _value pending_ Substitutions: Items swapped for an approved replacement.
      - _value pending_ Refunds: Orders refunded in part or in full.
      - **4.8** Rating: Average driver rating, the one number already in."
    `);
  });

  it('renders Slack as one field per number', () => {
    expect(runtime.surfaces.slack.renderNode(pendingExample).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "fields": [
            {
              "text": "_value pending_
      *On time*
      Orders delivered inside the booked slot.",
              "type": "mrkdwn",
            },
            {
              "text": "_value pending_
      *Substitutions*
      Items swapped for an approved replacement.",
              "type": "mrkdwn",
            },
            {
              "text": "_value pending_
      *Refunds*
      Orders refunded in part or in full.",
              "type": "mrkdwn",
            },
            {
              "text": "*4.8*
      *Rating*
      Average driver rating, the one number already in.",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
      ]
    `);
  });
});
