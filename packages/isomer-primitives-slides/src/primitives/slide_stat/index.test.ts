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

import { example, pendingExample } from './examples';
import { markdown as markdownContent, text } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: object) =>
  runtime.validate(compose(node)).errors.map(({ path }) => path);

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideStat', () => {
  it('needs a value for a unit', () => {
    expect(errorPaths({ ...pendingExample, unit: 'ms' }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].unit",
      ]
    `);
  });

  it('renders text and markdown, with a placeholder for a pending value', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"2.1 days — Median time from refund request to money back in the customer account, down from five."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**2.1 days** — Median time from refund request to money back in the customer account, down from **five**."`
    );
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"[value pending] — Orders delivered inside the booked slot. The first full month of data lands in May."`
    );
    expect(markdown(pendingExample)).toMatchInlineSnapshot(
      `"_value pending_ — Orders delivered inside the booked slot. The first full month of data lands in May."`
    );
  });

  it('renders Slack as one section', () => {
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*2.1 days* — Median time from refund request to money back in the customer account, down from *five*.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });
});
