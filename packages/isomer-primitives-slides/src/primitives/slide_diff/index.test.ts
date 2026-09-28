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

import { configExample, example, examples } from './examples';
import { markdown, slack, text } from './index';
import type { SlideDiffNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: unknown): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideDiff', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(errorPaths(node)).toEqual([]);
    }
  });

  it.each(
    ['\n', '\r', '\u2028', '\u2029'].map((mark) => [JSON.stringify(mark), mark])
  )('rejects an entry split by %s', (_name, mark) => {
    expect(
      errorPaths({ type: 'slideDiff', lines: [{ text: `one${mark}two` }] })
    ).toEqual([
      'body[0].body[0].lines: one line per entry: split multi-line source into separate lines',
    ]);
  });

  it('prefixes each line in text', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "refund.ts · before and after
       export const refund = async (order: Order) => {
      -  await fraud.check(order);
         await ledger.write(order.id, -order.total);
      +  await fraud.check(order);
         return notify(order.customer);
       };"
    `);
  });

  it('fences the lines as diff in markdown', () => {
    expect(markdown(configExample).split('\n')).toEqual([
      '```diff',
      ' checkout:',
      '-  timeout: 30s',
      '+  timeout: 10s',
      '+  retries: 3',
      ' ',
      '   currency: EUR',
      '```',
    ]);
  });

  it('keeps a whitespace-only change visible', () => {
    const node: SlideDiffNode = {
      type: 'slideDiff',
      lines: [
        { text: 'total: 3 ', op: 'remove' },
        { text: 'total: 3', op: 'add' },
      ],
    };
    expect(text(node).split('\n')).toEqual(['-total: 3 ', '+total: 3']);
  });

  it('lengthens the fence past a backtick run in a line', () => {
    const node: SlideDiffNode = {
      type: 'slideDiff',
      lines: [{ text: '```js', op: 'add' }],
    };
    expect(markdown(node)).toMatch(/^````diff\n/);
  });

  it('puts the lines in a Slack code block under the caption', () => {
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "refund.ts · before and after
      \`\`\`
       export const refund = async (order: Order) => {
      -  await fraud.check(order);
         await ledger.write(order.id, -order.total);
      +  await fraud.check(order);
         return notify(order.customer);
       };
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('keeps a blank line visible on the slide', () => {
    expect(runtime.surfaces.html.render(compose(configExample)).html).toContain(
      ' '
    );
  });
});
