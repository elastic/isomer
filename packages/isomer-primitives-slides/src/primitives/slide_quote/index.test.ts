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

import { slideDeckFrame, slidesPack } from '../../pack';
import { quoteFit } from '../../theme/components/quote';
import { slideLayout } from '../layout';
import { sizeForLoad } from '../size';
import {
  crowdingBelow,
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';

import { example, longExample, shortExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

// Load budgets are set below the reference heading, where crowding is 1.
const stepOf = (node: object): string | undefined =>
  renderedStep('quote-textSize', node, referenceHeading);

describe('slideQuote', () => {
  it('needs words and a source', () => {
    expect(schema.safeParse({ ...example, text: '' }).success).toBe(false);
    expect(schema.safeParse({ ...example, source: '' }).success).toBe(false);
  });

  it('renders text, markdown, and Slack with a context', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `
      "“I stopped checking my bank app once the refund email said which day it would land.”
      — Priya N., Customer interview, March"
    `
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

  it('sets source, joiner, and context as one run beside the rule', () => {
    const { html } = runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [example] } as PrimitiveNode],
    });
    expect(/<figcaption[^>]*>(.*?)<\/figcaption>/.exec(html)?.[1]).toMatch(
      /^<span[^>]*><\/span><span><span[^>]*>Priya N\.<\/span>, <span[^>]*>Customer interview, March<\/span><\/span>$/
    );
  });

  it('leaves the context out of the attribution when there is none', () => {
    expect(text(shortExample)).toMatchInlineSnapshot(
      `
      "“Ship the boring version first.”
      — Payments team charter"
    `
    );
  });

  it.each([
    [quoteFit.l, 'l'],
    [quoteFit.l + 1, 'm'],
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

  it('keeps an authored size', () => {
    expect(stepOf({ ...longExample, size: 'l' })).toBe('l');
    expect(stepOf({ ...shortExample, size: 's' })).toBe('s');
  });

  it('takes the whole body on a slide with no heading', () => {
    const node = {
      type: 'slideQuote',
      text: 'x'.repeat(quoteFit.l + 1),
      source: 'A',
    };
    const step = sizeForLoad(
      undefined,
      quoteFit.l + 1,
      quoteFit,
      slideLayout(undefined).crowding
    );
    expect(stepOf(node)).toBe('m');
    expect(step).toBe('l');
    expect(renderedStep('quote-textSize', node)).toBe(step);
  });

  it("scales its load by the heading's crowding", () => {
    const node = {
      type: 'slideQuote',
      text: 'x'.repeat(quoteFit.l),
      source: 'A',
    };
    const step = sizeForLoad(
      undefined,
      quoteFit.l,
      quoteFit,
      crowdingBelow(crowdingHeading)
    );
    expect(step).not.toBe('l');
    expect(renderedStep('quote-textSize', node, crowdingHeading)).toBe(step);
  });
});
