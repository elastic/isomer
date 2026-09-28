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
import { quoteFit } from '../../theme/components/quote';

import { example, examples, shortExample } from './examples';
import { markdown, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const stepOf = (node: object): string | undefined =>
  /quote-textSize-(\w+)/.exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
    }).html
  )?.[1];

const quoteOf = (length: number) => ({
  type: 'slideQuote',
  text: 'x'.repeat(length),
  source: 'Priya N.',
});

describe('slideQuote schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect(schema.safeParse(node).success).toBe(true);
    }
  });

  it('needs the words and a source, and leaves the context optional', () => {
    const { context: _context, ...withoutContext } = example;
    expect(schema.safeParse(withoutContext).success).toBe(true);
    expect(schema.safeParse({ ...example, text: '' }).success).toBe(false);
    expect(schema.safeParse({ ...example, source: '' }).success).toBe(false);
    expect(schema.safeParse({ ...example, context: '' }).success).toBe(false);
    const { source: _source, ...withoutSource } = example;
    expect(schema.safeParse(withoutSource).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(schema.safeParse({ ...example, date: 'March' }).success).toBe(false);
  });
});

describe('slideQuote output', () => {
  it('renders text, markdown, and Slack with the context', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"“I stopped checking my bank app once the refund email said which day it would land.” — Priya N., Customer interview, March"`
    );
    expect(markdown(example)).toMatchInlineSnapshot(`
      "> “I stopped checking my bank app once the refund email said **which day** it would land.”
      >
      > — Priya N., Customer interview, March"
    `);
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "> “I stopped checking my bank app once the refund email said *which day* it would land.”
      > — Priya N., Customer interview, March",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('renders text, markdown, and Slack without a context', () => {
    expect(text(shortExample)).toMatchInlineSnapshot(
      `"“Ship the boring version first.” — Payments team charter"`
    );
    expect(markdown(shortExample)).toMatchInlineSnapshot(`
      "> “Ship the boring version first.”
      >
      > — Payments team charter"
    `);
    expect(slack(shortExample)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "> “Ship the boring version first.”
      > — Payments team charter",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });
});

describe('slideQuote step', () => {
  it.each([
    [quoteFit.l, 'l'],
    [quoteFit.l + 1, 'm'],
    [quoteFit.m, 'm'],
    [quoteFit.m + 1, 's'],
  ])('sets a %i-character quote at %s', (length, step) => {
    expect(stepOf(quoteOf(length))).toBe(step);
  });

  it('keeps an authored size', () => {
    expect(stepOf({ ...quoteOf(10), size: 's' })).toBe('s');
  });
});
