/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { statementFit } from '../../theme/components/statement';
import { slideLayout } from '../layout';
import { sizeForLoad } from '../size';
import {
  crowdingBelow,
  crowdingHeading,
  referenceHeading,
  renderedStep,
} from '../size.fixtures';

import { example, longExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

// Load budgets are set below the reference heading, where crowding is 1.
const stepOf = (node: object): string | undefined =>
  renderedStep('statement-textSize', node, referenceHeading);

describe('slideStatement', () => {
  it('needs a sentence', () => {
    expect(schema.safeParse({ ...example, text: '' }).success).toBe(false);
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"A REFUND IS A PROMISE, NOT A TRANSACTION."`
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

  it.each([
    [statementFit.l, 'l'],
    [statementFit.l + 1, 'm'],
    [statementFit.m, 'm'],
    [statementFit.m + 1, 's'],
  ])('sets %i characters at %s', (length, step) => {
    expect(stepOf({ type: 'slideStatement', text: 'x'.repeat(length) })).toBe(
      step
    );
  });

  it('counts a line break as the space it draws', () => {
    expect(
      stepOf({
        type: 'slideStatement',
        text: `${'x'.repeat(statementFit.l - 1)}\nx`,
      })
    ).toBe('m');
  });

  it('keeps an authored size', () => {
    expect(stepOf({ ...longExample, size: 'l' })).toBe('l');
    expect(stepOf({ ...example, size: 's' })).toBe('s');
  });

  it('keeps its marks when Slack sets it as bold rich text', () => {
    const [block] = slack({
      type: 'slideStatement',
      text: `Call \`refund()\` ${'x'.repeat(150)}`,
    });
    expect(block).toMatchObject({ type: 'rich_text' });
    expect(JSON.stringify(block)).toContain(
      '{"type":"text","text":"refund()","style":{"code":true,"bold":true}}'
    );
  });

  it('takes the whole body on a slide with no heading', () => {
    const node = {
      type: 'slideStatement',
      text: 'x'.repeat(statementFit.l + 1),
    };
    const step = sizeForLoad(
      undefined,
      statementFit.l + 1,
      statementFit,
      slideLayout(undefined).crowding
    );
    expect(stepOf(node)).toBe('m');
    expect(step).toBe('l');
    expect(renderedStep('statement-textSize', node)).toBe(step);
  });

  it("scales its load by the heading's crowding", () => {
    const node = { type: 'slideStatement', text: 'x'.repeat(statementFit.l) };
    const step = sizeForLoad(
      undefined,
      statementFit.l,
      statementFit,
      crowdingBelow(crowdingHeading)
    );
    expect(step).not.toBe('l');
    expect(renderedStep('statement-textSize', node, crowdingHeading)).toBe(
      step
    );
  });
});
