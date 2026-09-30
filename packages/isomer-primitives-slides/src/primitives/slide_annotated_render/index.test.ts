/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { placeholderExample } from './examples';
import { legendStep, renderStep } from './fit';
import { slideAnnotatedRenderPrimitive } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const node = {
  ...placeholderExample,
  pins: placeholderExample.pins.slice(0, 2),
};

describe('slideAnnotatedRender', () => {
  it('measures six pins, the most a legend holds', () => {
    expect(placeholderExample.pins).toHaveLength(6);
  });

  it('walks its render as its one child', () => {
    expect(slideAnnotatedRenderPrimitive.children?.(node)).toEqual([
      { node: node.render, path: 'render' },
    ]);
  });

  it('numbers the legend on every surface', () => {
    expect(runtime.surfaces.text.renderNode(node)).toMatchInlineSnapshot(`
      "orders-admin · svg

      1. Search — Filters by store and date.
      2. Export — Downloads the rows as CSV."
    `);
    expect(runtime.surfaces.markdown.renderNode(node)).toMatchInlineSnapshot(`
      "_orders-admin · svg_

      1. **Search** — Filters by store and date.
      2. **Export** — Downloads the rows as CSV."
    `);
    expect(runtime.surfaces.slack.renderNode(node).blocks.at(-1))
      .toMatchInlineSnapshot(`
      {
        "text": {
          "text": "1. *Search* — Filters by store and date.
      2. *Export* — Downloads the rows as CSV.",
          "type": "mrkdwn",
        },
        "type": "section",
      }
    `);
  });

  it('steps the render and legend down as the heading crowds them', () => {
    expect([0.8, 0.9, 1.1].map((crowding) => renderStep(crowding))).toEqual([
      'l',
      'm',
      's',
    ]);
    expect(legendStep(node.pins)).toBe('l');
    expect(
      [0.8, 0.9].map((crowding) =>
        legendStep(placeholderExample.pins, crowding)
      )
    ).toEqual(['m', 's']);
  });
});
