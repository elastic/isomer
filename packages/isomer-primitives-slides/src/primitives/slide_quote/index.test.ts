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
import { quoteFit } from '../../theme/components/quote';

import { example, longExample, shortExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const stepOf = (node: object): string | undefined =>
  /quote-textSize-(\w+)/.exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
    } satisfies Composition).html
  )?.[1];

describe('slideQuote', () => {
  it('needs words and a source, and caps the words', () => {
    expect(schema.safeParse({ ...example, source: '' }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, text: 'x'.repeat(301) }).success
    ).toBe(false);
  });

  it('renders text, markdown, and Slack with a context', () => {
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

  it('leaves the context out of the attribution when there is none', () => {
    expect(text(shortExample)).toMatchInlineSnapshot(
      `"“Ship the boring version first.” — Payments team charter"`
    );
  });

  it.each([
    [quoteFit.l, 'l'],
    [quoteFit.m, 'm'],
    [quoteFit.m + 1, 's'],
  ])('sets %i characters at %s', (length, step) => {
    expect(
      stepOf({ type: 'slideQuote', text: 'x'.repeat(length), source: 'A' })
    ).toBe(step);
  });

  it('sets the longest example at the smallest step', () => {
    expect(stepOf(longExample)).toBe('s');
  });
});
