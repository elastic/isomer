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
import { authoredStrings, slackText } from '../test_helpers.fixtures';

import { example, examples, pendingExample } from './examples';
import { markdown, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const authored = authoredStrings(['type', 'tone', 'marker']);

describe('slideStats', () => {
  it('holds two to four numbers', () => {
    const [first] = example.items;
    expect(schema.safeParse({ ...example, items: [first] }).success).toBe(
      false
    );
    expect(
      schema.safeParse({ ...example, items: Array(5).fill(first) }).success
    ).toBe(false);
  });

  it('rejects a unit without a value', () => {
    const { errors } = runtime.validate(
      compose({
        type: 'slideStats',
        items: [
          { unit: 'ms', label: 'Latency', body: 'p99.' },
          { value: '3', label: 'Regions', body: 'Active.' },
        ],
      })
    );
    expect(
      errors.map(({ path, message }) => [
        path,
        message.includes('unit needs a value'),
      ])
    ).toEqual([['body[0].body[0].items[0].unit', true]]);
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "3 Regions: Checkout now runs active-active in each of them.
      40 ms p99 latency: Measured at the edge during the spring sale peak.
      0 Failed payments: Across two regional failovers in the same week."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- **3** Regions: Checkout now runs **active-active** in each of them.
      - **40 ms** p99 latency: Measured at the edge during the spring sale peak.
      - **0** Failed payments: Across two regional failovers in the same week."
    `);
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "fields": [
            {
              "text": "*3*
      *Regions*
      Checkout now runs *active-active* in each of them.",
              "type": "mrkdwn",
            },
            {
              "text": "*40 ms*
      *p99 latency*
      Measured at the edge during the spring sale peak.",
              "type": "mrkdwn",
            },
            {
              "text": "*0*
      *Failed payments*
      Across two regional failovers in the same week.",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
      ]
    `);
  });

  it('marks missing values as pending instead of inventing them', () => {
    expect(markdown(pendingExample)).toContain(
      '- _value pending_ On time: Orders delivered inside the booked slot.'
    );
    expect(text(pendingExample)).toContain('[value pending] Refunds:');
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string in example %i',
    (_, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.replace(/[`*]/g, '').toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  );
});
