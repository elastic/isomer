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

import { example } from './examples';
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

describe('slideLayers', () => {
  it('holds three to six layers, each with body or chips', () => {
    expect(errorPaths({ ...example, layers: example.layers.slice(0, 2) }))
      .toMatchInlineSnapshot(`
        [
          "body[0].body[0].layers",
        ]
      `);
    const [first, ...rest] = example.layers;
    expect(
      errorPaths({ ...example, layers: [{ ...first, body: 'Both.' }, ...rest] })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].layers[0]",
      ]
    `);
    expect(
      errorPaths({
        ...example,
        layers: [{ name: 'Edge', owner: 'Ops' }, ...rest],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].layers[0]",
      ]
    `);
  });

  it('renders text and markdown', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Apps — ios, android, web · Client team
      Gateway — Routes, rate-limits, and authenticates every request · Platform
      Services — Orders, catalog, and delivery slots, each deployed on its own · Product teams
      Data — postgres, redis, kafka · Data team
      Cloud — Compute, storage, and the network under all of it · Provider"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "1. **Apps** — \`ios\`, \`android\`, \`web\` · _Client team_
      2. **Gateway** — Routes, rate-limits, and authenticates every request · _Platform_
      3. **Services** — Orders, catalog, and **delivery slots**, each deployed on its own · _Product teams_
      4. **Data** — \`postgres\`, \`redis\`, \`kafka\` · _Data team_
      5. **Cloud** — Compute, storage, and the network under all of it · _Provider_"
    `);
  });

  it('renders Slack as an ordered list, top layer first', () => {
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
                      "style": {
                        "bold": true,
                      },
                      "text": "Apps",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "ios",
                      "type": "text",
                    },
                    {
                      "text": ", ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "android",
                      "type": "text",
                    },
                    {
                      "text": ", ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "web",
                      "type": "text",
                    },
                    {
                      "text": " · ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "italic": true,
                      },
                      "text": "Client team",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Gateway",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "Routes, rate-limits, and authenticates every request",
                      "type": "text",
                    },
                    {
                      "text": " · ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "italic": true,
                      },
                      "text": "Platform",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Services",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "Orders, catalog, and ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "delivery slots",
                      "type": "text",
                    },
                    {
                      "text": ", each deployed on its own",
                      "type": "text",
                    },
                    {
                      "text": " · ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "italic": true,
                      },
                      "text": "Product teams",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Data",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "postgres",
                      "type": "text",
                    },
                    {
                      "text": ", ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "redis",
                      "type": "text",
                    },
                    {
                      "text": ", ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "code": true,
                      },
                      "text": "kafka",
                      "type": "text",
                    },
                    {
                      "text": " · ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "italic": true,
                      },
                      "text": "Data team",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "Cloud",
                      "type": "text",
                    },
                    {
                      "text": " — ",
                      "type": "text",
                    },
                    {
                      "text": "Compute, storage, and the network under all of it",
                      "type": "text",
                    },
                    {
                      "text": " · ",
                      "type": "text",
                    },
                    {
                      "style": {
                        "italic": true,
                      },
                      "text": "Provider",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "ordered",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});
