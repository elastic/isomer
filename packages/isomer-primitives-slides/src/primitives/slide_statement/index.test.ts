/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';
import { statementFit } from '../../theme/components/statement';

import { example, examples } from './examples';
import { markdown, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const stepOf = (node: object): string | undefined =>
  /statement-textSize-(\w+)/.exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
    }).html
  )?.[1];

const sentence = (length: number) => 'x'.repeat(length);

describe('slideStatement schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect(schema.safeParse(node).success).toBe(true);
    }
  });

  it('bounds the sentence to one Slack header', () => {
    const at = (length: number) =>
      schema.safeParse({ type: 'slideStatement', text: sentence(length) })
        .success;
    expect(at(150)).toBe(true);
    expect(at(151)).toBe(false);
    expect(at(0)).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(schema.safeParse({ ...example, lede: 'More' }).success).toBe(false);
  });
});

describe('slideStatement output', () => {
  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"A refund is a promise, not a transaction."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"# A refund is **a promise**, not a transaction."`
    );
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "A refund is a promise, not a transaction.",
            "type": "plain_text",
          },
          "type": "header",
        },
      ]
    `);
  });
});

describe('slideStatement step', () => {
  it.each([
    [statementFit.l, 'l'],
    [statementFit.l + 1, 'm'],
    [statementFit.m, 'm'],
    [statementFit.m + 1, 's'],
  ])('sets a %i-character sentence at %s', (length, step) => {
    expect(stepOf({ type: 'slideStatement', text: sentence(length) })).toBe(
      step
    );
  });

  it('keeps an authored size', () => {
    expect(
      stepOf({ type: 'slideStatement', text: sentence(10), size: 's' })
    ).toBe('s');
  });

  it('counts the words, not the marks', () => {
    expect(
      stepOf({
        type: 'slideStatement',
        text: `**${sentence(statementFit.l)}**`,
      })
    ).toBe('l');
  });
});
