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

import { example, examples } from './examples';
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

describe('slideTerritoryGroup', () => {
  it('holds one to four owners in the two tones', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, items: Array(5).fill(example.items[0]) })
        .success
    ).toBe(false);
    const { errors } = runtime.validate(
      compose({
        ...example,
        items: [{ title: 'Ops', body: 'Pager.', tone: 'teal' }],
      })
    );
    expect(errors.map(({ path }) => path)).toContain(
      'body[0].body[0].items[0].tone'
    );
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Payments team: Card capture, fraud checks, and the ledger write.
      Card network: Authorization, chargebacks, and settlement timing."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "## Payments team

      Card capture, fraud checks, and **the ledger write**.

      ## Card network

      Authorization, chargebacks, and settlement timing."
    `);
  });

  it('renders Slack through the markdown fallback', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(example));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*Payments team*

      Card capture, fraud checks, and *the ledger write*.

      *Card network*

      Authorization, chargebacks, and settlement timing.",
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
