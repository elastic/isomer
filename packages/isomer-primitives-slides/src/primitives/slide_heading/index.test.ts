/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';
import { headingFit } from '../../theme/components/heading';

import { example, examples, titleOnlyExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideHeadingNode } from './schema';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const markdown = (node: SlideHeadingNode): string =>
  serializeMarkdown(markdownContent(node));

const stepOf = (node: object): string | undefined =>
  /heading-titleSize-(\w+)/.exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
    }).html
  )?.[1];

const titled = (length: number) => ({
  type: 'slideHeading',
  title: 'x'.repeat(length),
});

describe('slideHeading schema', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect(schema.safeParse(node).success).toBe(true);
    }
  });

  it('needs a title and leaves the lede optional', () => {
    expect(schema.safeParse(titleOnlyExample).success).toBe(true);
    expect(schema.safeParse({ ...example, title: '' }).success).toBe(false);
    expect(schema.safeParse({ ...example, lede: '' }).success).toBe(false);
    expect(schema.safeParse({ type: 'slideHeading' }).success).toBe(false);
  });

  it('rejects an unknown field', () => {
    expect(schema.safeParse({ ...example, eyebrow: 'Q3' }).success).toBe(false);
  });
});

describe('slideHeading output', () => {
  it('renders text, markdown, and Slack with a lede', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "REFUNDS SETTLE IN TWO DAYS, NOT FIVE
      Moving the ledger write ahead of the fraud check removed three batch windows."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "# Refunds settle in two days, not five

      Moving the ledger write ahead of the fraud check removed three batch windows."
    `);
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "Refunds settle in two days, not five",
            "type": "plain_text",
          },
          "type": "header",
        },
        {
          "text": {
            "text": "Moving the ledger write ahead of the fraud check removed three batch windows.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('renders text, markdown, and Slack for a title alone', () => {
    expect(text(titleOnlyExample)).toMatchInlineSnapshot(
      `"EVERY REGION NOW READS FROM ONE CATALOG"`
    );
    expect(markdown(titleOnlyExample)).toMatchInlineSnapshot(
      `"# Every region now reads from one catalog"`
    );
    expect(slack(titleOnlyExample)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "emoji": true,
            "text": "Every region now reads from one catalog",
            "type": "plain_text",
          },
          "type": "header",
        },
      ]
    `);
  });
});

describe('slideHeading step', () => {
  it.each([
    [headingFit.l, 'l'],
    [headingFit.l + 1, 'm'],
    [headingFit.m, 'm'],
    [headingFit.m + 1, 's'],
  ])('sets a %i-character title at %s', (length, step) => {
    expect(stepOf(titled(length))).toBe(step);
  });

  it('keeps an authored size', () => {
    expect(stepOf({ ...titled(10), size: 's' })).toBe('s');
  });

  it('counts a wide glyph as two characters, as it is about twice as wide', () => {
    const wide = (count: number) => ({
      type: 'slideHeading',
      title: '界'.repeat(count),
    });
    expect(stepOf(wide(headingFit.l / 2))).toBe('l');
    expect(stepOf(wide(headingFit.l / 2 + 1))).toBe('m');
  });
});
