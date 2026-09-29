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

import { example, menuExample } from './examples';
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

describe('slideQuadrant', () => {
  it('holds exactly four quadrants of four items at most', () => {
    expect(errorPaths({ ...example, quadrants: example.quadrants.slice(1) }))
      .toMatchInlineSnapshot(`
      [
        "body[0].body[0].quadrants",
      ]
    `);
    expect(
      errorPaths({
        ...example,
        quadrants: [
          { label: 'Full', items: ['a', 'b', 'c', 'd', 'e'] },
          ...example.quadrants.slice(1),
        ],
      })
    ).toMatchInlineSnapshot(`
      [
        "body[0].body[0].quadrants[0].items",
      ]
    `);
  });

  it('places each quadrant by its axis ends in text and markdown', () => {
    expect(text(menuExample)).toMatchInlineSnapshot(`
      "y: Slow → Popular · x: Thin margin → Rich margin
      Plowhorses (Popular, Thin margin): drip, bagel, muffin, tea
      Stars (Popular, Rich margin): latte, cold brew
      Dogs (Slow, Thin margin)
      Puzzles (Slow, Rich margin): matcha, affogato, cortado"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "y: Minor → Major · x: Easy → Hard

      - **Quick wins** (Major, Easy): dark mode, saved carts
      - **Big bets** (Major, Hard): same-day
      - **Fill-ins** (Minor, Easy): new icons, sitemap
      - **Money pits** (Minor, Hard): own fleet"
    `);
  });

  it('renders Slack as the axes, then a field per quadrant', () => {
    expect(runtime.surfaces.slack.renderNode(example).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "y: Minor → Major · x: Easy → Hard",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "fields": [
            {
              "text": "*Quick wins* (Major, Easy)
      dark mode, saved carts",
              "type": "mrkdwn",
            },
            {
              "text": "*Big bets* (Major, Hard)
      same-day",
              "type": "mrkdwn",
            },
            {
              "text": "*Fill-ins* (Minor, Easy)
      new icons, sitemap",
              "type": "mrkdwn",
            },
            {
              "text": "*Money pits* (Minor, Hard)
      own fleet",
              "type": "mrkdwn",
            },
          ],
          "type": "section",
        },
      ]
    `);
  });

  it('names each cell by its axis ends', () => {
    expect(html(example)).toContain('role="group" aria-label="Major, Easy"');
  });
});
