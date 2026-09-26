/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';

import { example, examples } from './examples';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const validate = (node: unknown) =>
  runtime.validate({ type: 'view', body: [node as PrimitiveNode] }).errors;

const surfacesOutput = (node: PrimitiveNode) => [
  runtime.surfaces.text.renderNode(node),
  runtime.surfaces.markdown.renderNode(node),
  JSON.stringify(runtime.surfaces.slack.renderNode(node).blocks),
];

describe('slideRenderGrid', () => {
  it('accepts every example', () => {
    for (const node of examples) {
      expect(validate(node)).toEqual([]);
    }
  });

  it('takes two to six tiles, each surface once', () => {
    expect(validate({ ...example, tiles: example.tiles.slice(0, 1) }))
      .toMatchInlineSnapshot(`
        [
          {
            "message": "must have at least 2 items",
            "nodeType": "slideRenderGrid",
            "path": "body[0].tiles",
          },
        ]
      `);
    expect(
      validate({ ...example, tiles: [example.tiles[0], example.tiles[0]] })
    ).toMatchInlineSnapshot(`
      [
        {
          "message": "each surface may appear once",
          "nodeType": "slideRenderGrid",
          "path": "body[0].tiles",
        },
      ]
    `);
  });

  it('rejects a render inside the embedded composition', () => {
    const nested = {
      ...example,
      composition: {
        type: 'view',
        body: [{ type: 'slideRender', slide: '01', surface: 'svg' }],
      },
    };
    expect(validate(nested)).toMatchInlineSnapshot(`
      [
        {
          "message": "an embedded composition cannot embed another render",
          "nodeType": "slideRender",
          "path": "body[0].composition.body[0]",
        },
      ]
    `);
  });

  it('renders text, markdown, and Slack for the canonical example', () => {
    const [text, markdown, slack] = surfacesOutput(example);
    expect(text).toMatchInlineSnapshot(`
      "[Delivery times on 6 surfaces]
      react: Inside the ops dashboard
      html: The weekly email
      svg: A PNG for the board pack
      slack: The #ops channel
      markdown: The runbook wiki
      text: Driver SMS

        ORDERS NOW ARRIVE IN UNDER 30 MINUTES
        Routing from the nearest store cut the median wait by eleven minutes.

        Basket · 02 Operations"
    `);
    expect(markdown).toMatchInlineSnapshot(`
      "_[Delivery times on 6 surfaces]_

      - **react**: Inside the ops dashboard
      - **html**: The weekly email
      - **svg**: A PNG for the board pack
      - **slack**: The #ops channel
      - **markdown**: The runbook wiki
      - **text**: Driver SMS

      > # Orders now arrive in under 30 minutes
      >
      > Routing from the nearest store cut the median wait by eleven minutes.
      >
      > _Basket · 02 Operations_"
    `);
    expect(JSON.parse(slack!)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "*react* Inside the ops dashboard",
              "type": "mrkdwn",
            },
            {
              "text": "*html* The weekly email",
              "type": "mrkdwn",
            },
            {
              "text": "*svg* A PNG for the board pack",
              "type": "mrkdwn",
            },
            {
              "text": "*slack* The #ops channel",
              "type": "mrkdwn",
            },
            {
              "text": "*markdown* The runbook wiki",
              "type": "mrkdwn",
            },
            {
              "text": "*text* Driver SMS",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
        {
          "text": {
            "text": "*Orders now arrive in under 30 minutes*",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": " ",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "text": {
            "text": "Routing from the nearest store cut the median wait by eleven minutes.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
        {
          "elements": [
            {
              "text": "Basket · 02 Operations",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });

  it('carries every caption and the embedded content to every surface', () => {
    for (const node of examples) {
      for (const output of surfacesOutput(node)) {
        for (const value of [
          ...node.tiles.map(({ caption }) => caption),
          'Orders now arrive in under 30 minutes',
          'Routing from the nearest store cut the median wait by eleven minutes.',
        ]) {
          expect(output.toLowerCase(), value).toContain(value.toLowerCase());
        }
      }
    }
  });

  it('draws one tile per surface', () => {
    const html = renderToStaticMarkup(
      runtime.surfaces.react.render({ type: 'view', body: [example] })
    );
    expect(html.match(/<figure/g)).toHaveLength(6);
  });
});
