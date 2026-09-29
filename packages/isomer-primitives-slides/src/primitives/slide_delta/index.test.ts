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

const html = (node: object): string =>
  runtime.surfaces.html.render(compose(node)).html;

describe('slideDelta', () => {
  it('states a change only between two values', () => {
    expect(errorPaths({ ...pendingExample, change: '+3' }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].change",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(
      `"Old checkout 4.2s → New checkout 1.1s. −74%: Median time from Pay to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(markdown(example)).toMatchInlineSnapshot(
      `"**Old checkout** 4.2s → **New checkout** 1.1s. **−74%**: Median time from **Pay** to the confirmation page, measured over the same two weeks of traffic."`
    );
    expect(text(pendingExample)).toMatchInlineSnapshot(
      `"Before the move 38 → After the move [value pending]. Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th."`
    );
  });

  it('renders Slack as one rich text line', () => {
    expect(runtime.surfaces.slack.renderNode(pendingExample).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "Before the move",
                  "type": "text",
                },
                {
                  "text": " ",
                  "type": "text",
                },
                {
                  "text": "38",
                  "type": "text",
                },
                {
                  "text": " → ",
                  "type": "text",
                },
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "After the move",
                  "type": "text",
                },
                {
                  "text": " ",
                  "type": "text",
                },
                {
                  "style": {
                    "italic": true,
                  },
                  "text": "value pending",
                  "type": "text",
                },
                {
                  "text": ". ",
                  "type": "text",
                },
                {
                  "text": "Support tickets per thousand orders; the first full month on the new warehouse closes on the 30th.",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });

  it('names the arrow for assistive technology', () => {
    expect(html(example)).toContain('role="img" aria-label="leads to"');
  });
});
