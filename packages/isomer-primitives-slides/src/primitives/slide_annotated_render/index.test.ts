/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import {
  annotatedRender,
  annotatedRenderShares,
} from '../../theme/components/annotated_render';
import { frame } from '../../theme/components/frame';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { trackWidth } from '../size';
import { captionHeight } from '../slide_render/fit';
import { headline } from '../slide_render/output';

import { placeholderExample } from './examples';
import { annotatedScale, legendStep } from './fit';
import { slideAnnotatedRenderPrimitive } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const slideWidth = scalePx(frame.width);
const slideHeight = scalePx(frame.height);

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

  it('draws the slide as wide as its column, or as tall as the room under its caption', () => {
    const column = trackWidth(
      openBody.width,
      annotatedRenderShares,
      annotatedRender.gap
    );
    const { render: embedded } = placeholderExample;
    expect(annotatedScale(embedded, openBody)).toBeCloseTo(column / slideWidth);
    expect(annotatedScale(embedded, { ...openBody, height: 400 })).toBeCloseTo(
      (400 - captionHeight(headline(embedded), column)) / slideHeight
    );
  });

  it('steps the legend down as its layout shortens', () => {
    const at = (height: number) =>
      legendStep(placeholderExample.pins, { ...openBody, height });
    expect([759.5, 760].map(at)).toEqual(['m', 'l']);
    expect([615.5, 616].map(at)).toEqual(['s', 'm']);
    expect(legendStep(node.pins, openBody)).toBe('l');
    expect(legendStep(node.pins, { ...openBody, height: 254.5 })).toBe('m');
  });
});
