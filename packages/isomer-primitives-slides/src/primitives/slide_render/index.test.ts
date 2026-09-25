/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  buildAuthoringJsonSchema,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';
import { slideDeckPrimitives } from '../../registry';

import {
  deliverySlide,
  example,
  examples,
  placeholderExample,
  slackExample,
} from './examples';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const validate = (node: unknown) =>
  runtime.validate({ type: 'view', body: [node as PrimitiveNode] }).errors;

const surfacesOutput = (node: PrimitiveNode) => [
  runtime.surfaces.text.renderNode(node),
  runtime.surfaces.markdown.renderNode(node),
  JSON.stringify(runtime.surfaces.slack.renderNode(node).blocks),
];

/** Every `slideHeading` title and lede under `node`. */
const headingStrings = (node: unknown): string[] => {
  if (Array.isArray(node)) {
    return node.flatMap(headingStrings);
  }
  if (typeof node !== 'object' || node === null) {
    return [];
  }
  const { type, title, lede } = node as Record<string, unknown>;
  return type === 'slideHeading'
    ? [title, lede].filter(
        (value): value is string => typeof value === 'string'
      )
    : Object.values(node).flatMap(headingStrings);
};

describe('slideRender', () => {
  it('accepts every example, including an embedded slideFrame', () => {
    for (const node of examples) {
      expect(validate(node), JSON.stringify(node)).toEqual([]);
    }
  });

  it('projects to the authoring JSON Schema with the embedded envelope', () => {
    const schema = JSON.stringify(
      buildAuthoringJsonSchema(slideDeckPrimitives)
    );
    expect(schema).toContain('slideRender');
    expect(schema).toContain('slideRenderGrid');
  });

  it('needs a slide reference or a composition', () => {
    expect(validate({ type: 'slideRender', surface: 'svg' }))
      .toMatchInlineSnapshot(`
      [
        {
          "message": "needs a \`slide\` reference or a \`composition\`",
          "path": "body[0].composition",
        },
      ]
    `);
  });

  it('rejects a render inside the embedded composition', () => {
    const nested = {
      ...example,
      composition: {
        ...deliverySlide,
        body: [
          {
            type: 'slideFrame',
            body: [{ type: 'slideRender', slide: '01', surface: 'svg' }],
          },
        ],
      },
    };
    expect(validate(nested)).toMatchInlineSnapshot(`
      [
        {
          "message": "an embedded composition cannot embed another render",
          "path": "body[0].composition.body[0].body[0]",
        },
      ]
    `);
  });

  it('checks embedded nodes against the full vocabulary', () => {
    const unknown = {
      ...example,
      composition: { type: 'view', body: [{ type: 'slideNope' }] },
    };
    expect(validate(unknown)).not.toEqual([]);
  });

  it('keeps embedded ids apart from the host slide', () => {
    const host = {
      type: 'slideFrame',
      body: [
        { type: 'slideHeading', id: 'claim', title: 'Host' },
        {
          ...example,
          composition: {
            type: 'view',
            body: [{ type: 'slideHeading', id: 'claim', title: 'Embedded' }],
          },
        },
      ],
    };
    expect(validate(host)).toEqual([]);
  });

  it('renders text, markdown, and Slack for the canonical example', () => {
    const [text, markdown, slack] = surfacesOutput(example);
    expect(text).toMatchInlineSnapshot(`
      "[svg render of slide delivery-times] The delivery slide, from the svg surface

        ORDERS NOW ARRIVE IN UNDER 30 MINUTES
        Routing from the nearest store cut the median wait by eleven minutes.

        Basket · 02 Operations"
    `);
    expect(markdown).toMatchInlineSnapshot(`
      "_[svg render of slide delivery-times] The delivery slide, from the svg surface_

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
              "text": "[svg render of slide delivery-times] The delivery slide, from the svg surface",
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

  it('carries its caption and the embedded content to every surface', () => {
    for (const node of examples) {
      const embedded = (node.composition?.body ?? []).flatMap(headingStrings);
      const strings = [node.caption, node.slide, ...embedded].filter(
        (value): value is string => value !== undefined
      );
      for (const output of surfacesOutput(node)) {
        for (const value of strings) {
          expect(output.toLowerCase(), value).toContain(value.toLowerCase());
        }
      }
    }
  });

  it('shows a placeholder until the host fills in the composition', () => {
    const html = renderToStaticMarkup(
      runtime.surfaces.react.render({
        type: 'view',
        body: [placeholderExample],
      })
    );
    expect(html).toContain('slide 04 · svg');
  });

  it('prints Slack blocks one per line on the slack surface', () => {
    const html = renderToStaticMarkup(
      runtime.surfaces.react.render({
        type: 'view',
        body: [slackExample],
      })
    );
    expect(html).toContain('header   Orders now arrive in under 30 minutes');
  });
});
