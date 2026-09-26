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
import { stripMarks } from '../../render/marks';
import { authoredStrings, slackText } from '../test_helpers.fixtures';

import { checkExample, example, examples, xExample } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const authored = authoredStrings(['type', 'tone', 'marker']);

describe('slideBulletList', () => {
  it('holds one to six items', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    const { errors } = runtime.validate(
      compose({ ...example, items: Array(7).fill('Point.') })
    );
    expect(errors.map(({ path }) => path)).toContain('body[0].body[0].items');
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

  it('renders Slack through the markdown fallback', () => {
    const { blocks } = runtime.surfaces.slack.render(compose(xExample));
    expect(blocks).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "*NOT THIS QUARTER*

      - × Same-day delivery outside the metro area.
      - × Gift wrapping.",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string in example %i',
    (_, node) => {
      const composition = compose(node);
      const outputs = [
        runtime.surfaces.text.render(composition),
        runtime.surfaces.markdown.render(composition),
        slackText(runtime.surfaces.slack.render(composition).blocks),
      ].map((output) => output.replace(/[`*]/g, '').toLowerCase());
      for (const value of authored(node)) {
        for (const output of outputs) {
          expect(output).toContain(stripMarks(value).toLowerCase());
        }
      }
    }
  );
});
