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
import { authoredTextMaxLength } from '../authored_text';

import { example, fullExample, singleExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideTreeNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: SlideTreeNode): string =>
  serializeMarkdown(markdownContent(node));

const errorPaths = (node: object) =>
  runtime.validate(compose(node)).errors.map(({ path }) => path);

describe('slideTree', () => {
  it('holds one to eight entries', () => {
    expect(schema.safeParse({ ...example, entries: [] }).success).toBe(false);
    expect(singleExample.entries).toHaveLength(1);
    expect(errorPaths(singleExample)).toEqual([]);
    // The fit test measures `fullExample` as the most entries a tree takes.
    expect(errorPaths(fullExample)).toEqual([]);
    expect(
      errorPaths({
        ...fullExample,
        entries: [...fullExample.entries, example.entries[0]],
      })
    ).toContain('body[0].body[0].entries');
  });

  it('caps a name only at the shared input-size guard', () => {
    const entry = (name: string) => ({
      ...singleExample,
      entries: [{ name, body: 'Note.' }],
    });
    expect(errorPaths(entry('x'.repeat(authoredTextMaxLength)))).toEqual([]);
    expect(errorPaths(entry('x'.repeat(authoredTextMaxLength + 1)))).toContain(
      'body[0].body[0].entries[0].name'
    );
  });

  it('draws connectors in text and fences them in markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "checkout/
      ├─ cart.ts           Line items, quantities, and the running total
      ├─ pricing.ts        Discounts and tax, applied in a fixed order
      ├─ payment/          One adapter per card network
      ├─ receipt.ts        The email and the in-app copy
      └─ checkout.test.ts  Every path a real order has taken"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "\`\`\`text
      checkout/
      ├─ cart.ts           Line items, quantities, and the running total
      ├─ pricing.ts        Discounts and tax, applied in a fixed order
      ├─ payment/          One adapter per card network
      ├─ receipt.ts        The email and the in-app copy
      └─ checkout.test.ts  Every path a real order has taken
      \`\`\`"
    `);
  });

  it('lengthens the fence past a backtick run in a name', () => {
    const fenced = markdown({
      ...singleExample,
      entries: [{ name: '```.md', body: 'Fences.' }],
    });
    expect(fenced).toMatch(/^````text\n/);
    expect(fenced.endsWith('````')).toBe(true);
  });

  it('renders Slack as one preformatted block', () => {
    expect(slack(singleExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "text": "runbooks/
      └─ failover.md  Steps to move traffic to the standby region",
                  "type": "text",
                },
              ],
              "type": "rich_text_preformatted",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});
