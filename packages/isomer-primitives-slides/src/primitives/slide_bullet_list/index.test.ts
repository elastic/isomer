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
import { slideDistillery } from '../../theme/distillery';

import { checkExample, example, fullExample, xExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideBulletList', () => {
  it('holds one to six items', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    const { errors } = runtime.validate(
      compose({ ...example, items: Array(7).fill('Point.') })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].items');
    // The fit test measures `fullExample` as the most points a list holds under a heading.
    expect(schema.safeParse(fullExample).success).toBe(true);
    expect(
      schema.safeParse({ ...fullExample, items: [...fullExample.items, 'x'] })
        .success
    ).toBe(false);
  });

  it('names a check or x marker for assistive technology and hides a dot', () => {
    const html = (node: object) =>
      runtime.surfaces.html.render(compose(node)).html;
    const { checkLabel, crossLabel } = slideDistillery.tokens.bulletList;
    expect(html(checkExample)).toContain(
      `role="img" aria-label="${checkLabel.value}"`
    );
    expect(html(xExample)).toContain(
      `role="img" aria-label="${crossLabel.value}"`
    );
    expect(html(example)).not.toContain('role="img"');
  });

  it('renders text and markdown', () => {
    expect(text(checkExample)).toMatchInlineSnapshot(`
      "IN THE SPRING RELEASE
      ✓ Saved carts across devices.
      ✓ Apple Pay at checkout."
    `);
    expect(markdown(checkExample)).toMatchInlineSnapshot(`
      "**IN THE SPRING RELEASE**

      - ✓ Saved carts across devices.
      - ✓ Apple Pay at checkout."
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "- Refunds post to the original card within **two days**.
      - Store credit is instant and never expires.
      - Returns by mail need no receipt."
    `);
  });

  it('renders Slack as a native bullet list under its label', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(xExample));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "*NOT THIS QUARTER*",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "× ",
                      "type": "text",
                    },
                    {
                      "text": "Same-day delivery outside the metro area.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "× ",
                      "type": "text",
                    },
                    {
                      "text": "Gift wrapping.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "elements": [
                    {
                      "text": "Refunds post to the original card within ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "two days",
                      "type": "text",
                    },
                    {
                      "text": ".",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "Store credit is instant and never expires.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "text": "Returns by mail need no receipt.",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});
