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

import { example, examples, plainExample } from './examples';
import { markdown, text } from './index';
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

describe('slideList', () => {
  it('holds one to six rows', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    const { errors } = runtime.validate(
      compose({ ...example, items: Array(7).fill(example.items[0]) })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].items');
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "SHIPPED IN 4.2

      Search: Tolerates typos, even in brand names
      Cart: Survives a lost connection and syncs later
      Checkout: Saves a card with one tap
      Receipts: Arrive by email and in the app

      Each change shipped behind a flag and reached every customer within a week."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "**SHIPPED IN 4.2**

      - **Search**: Tolerates typos, even in brand names
      - **Cart**: Survives a lost connection and syncs later
      - **Checkout**: Saves a card with one tap
      - **Receipts**: Arrive by email and in the app

      Each change shipped behind a flag and reached every customer within a week."
    `);
  });

  it('renders rows with no term as the bare fact', () => {
    expect(markdown(plainExample)).toBe(
      plainExample.items.map(({ body }) => `- ${body}`).join('\n')
    );
  });

  it('renders Slack through the markdown fallback', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(example));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*SHIPPED IN 4.2*

      - *Search*: Tolerates typos, even in brand names
      - *Cart*: Survives a lost connection and syncs later
      - *Checkout*: Saves a card with one tap
      - *Receipts*: Arrive by email and in the app

      Each change shipped behind a flag and reached every customer within a week.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
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
