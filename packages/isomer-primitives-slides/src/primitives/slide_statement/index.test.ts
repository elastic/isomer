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
import { statementFit } from '../../theme/components/statement';
import { sizeForLoad } from '../size';
import { crowdingHeading, renderedStep } from '../size.fixtures';
import { headingCrowding } from '../slide_heading/fit';

import { example, longExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

const stepOf = (node: object): string | undefined =>
  /statement-textSize-(\w+)/.exec(
    runtime.surfaces.html.render({
      type: 'view',
      body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
    } satisfies Composition).html
  )?.[1];

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

  it("scales its load by the heading's crowding", () => {
    const node = { type: 'slideStatement', text: 'x'.repeat(statementFit.l) };
    const step = sizeForLoad(
      undefined,
      statementFit.l,
      statementFit,
      headingCrowding(crowdingHeading)
    );
    expect(step).not.toBe('l');
    expect(renderedStep('statement-textSize', node, crowdingHeading)).toBe(
      step
    );
  });
});
