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

/** Keys whose values are enum choices, not authored copy. */
const enumKeys = new Set(['type', 'tone', 'marker']);

const authored = (value: unknown, key = ''): string[] => {
  if (typeof value === 'string') {
    return enumKeys.has(key) ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => authored(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => authored(v, k));
  }
  return [];
};

const slackText = (value: unknown): string =>
  authored(value)
    .filter(
      (entry) => !/^(mrkdwn|plain_text|section|context|header)$/.test(entry)
    )
    .join('\n');

describe('slideStat', () => {
  it('rejects a unit without a value', () => {
    const { errors } = runtime.validate(
      compose({ type: 'slideStat', unit: 'KB', body: 'Stylesheet size.' })
    );
    expect(
      errors.map(({ path, message }) => [
        path,
        message.includes('unit needs a value'),
      ])
    ).toEqual([['body[0].body[0].unit', true]]);
    expect(schema.safeParse({ type: 'slideStat', body: 'x' }).success).toBe(
      true
    );
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"2.1 days — Median time from refund request to money back in the customer account, down from five."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**2.1 days** — Median time from refund request to money back in the customer account, down from five."`
    );
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*2.1 days* — Median time from refund request to money back in the customer account, down from five.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('marks a missing value as pending instead of inventing one', () => {
    expect(text(pendingExample)).toMatch(/^\[value pending\] — Orders/);
    expect(markdown(pendingExample)).toMatch(/^_value pending_ — Orders/);
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string in example %i',
    (_, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(value.toLowerCase());
        }
      }
    }
  );
});
