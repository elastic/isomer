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
import { expectCountBounds } from '../bounds.fixtures';

import { example, fullExample } from './examples';
import { markdown as markdownContent, text } from './index';
import { layersMaxChips, layersMaxLayers, schema } from './schema';

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
  // The fit test measures this, so it holds the most layers a stack takes.
  it('pins the fullest example at the cap', () => {
    expect(fullExample.layers).toHaveLength(layersMaxLayers);
  });

  it('holds three to six layers', () => {
    const [first] = example.layers;
    expectCountBounds(
      schema,
      example,
      'layers',
      [3, layersMaxLayers],
      first,
      fullExample
    );
  });

  it('holds one to six chips in a layer', () => {
    const [first, ...rest] = example.layers;
    const chips = (count: number) =>
      errorPaths({
        ...example,
        layers: [
          { ...first, chips: Array.from({ length: count }, () => 'web') },
          ...rest,
        ],
      });
    expect(chips(layersMaxChips)).toEqual([]);
    expect(chips(layersMaxChips + 1)).toEqual([
      'body[0].body[0].layers[0].chips',
    ]);
    expect(chips(0)).toEqual(['body[0].body[0].layers[0].chips']);
  });

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
      "Apps — ios, android, web · ● CLIENT TEAM
      Gateway — Routes, rate-limits, and authenticates every request · ● PLATFORM
      Services — Orders, catalog, and delivery slots, each deployed on its own · PRODUCT TEAMS
      Data — postgres, redis, kafka · DATA TEAM
      Cloud — Compute, storage, and the network under all of it · ○ PROVIDER"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "1. **Apps** — \`ios\`, \`android\`, \`web\` · ● _CLIENT TEAM_
      2. **Gateway** — Routes, rate-limits, and authenticates every request · ● _PLATFORM_
      3. **Services** — Orders, catalog, and **delivery slots**, each deployed on its own · _PRODUCT TEAMS_
      4. **Data** — \`postgres\`, \`redis\`, \`kafka\` · _DATA TEAM_
      5. **Cloud** — Compute, storage, and the network under all of it · ○ _PROVIDER_"
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
                        "text": "● ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "italic": true,
                        },
                        "text": "CLIENT TEAM",
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
                        "text": "● ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "italic": true,
                        },
                        "text": "PLATFORM",
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
                        "text": "PRODUCT TEAMS",
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
                        "text": "DATA TEAM",
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
                        "text": "○ ",
                        "type": "text",
                      },
                      {
                        "style": {
                          "italic": true,
                        },
                        "text": "PROVIDER",
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
