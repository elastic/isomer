/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import {
  annotatedRender,
  annotatedRenderShares,
} from '../../theme/components/annotated_render';
import { frame } from '../../theme/components/frame';
import { marks } from '../../theme/components/marks';
import { scalePx } from '../../theme/scale';
import { openBody } from '../layout';
import { trackWidth } from '../size';
import { tallestExample } from '../slide_heading/examples';
import { headingRoom } from '../slide_heading/fit';
import { captionHeight } from '../slide_render/fit';
import { headline } from '../slide_render/output';

import { example, placeholderExample } from './examples';
import { annotatedScale, legendHeight, legendStep } from './fit';
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

  it('takes pin positions from 0 to 100, never NaN or infinite', () => {
    const at = (x: number) =>
      slideAnnotatedRenderPrimitive.schema.safeParse({
        ...node,
        pins: [{ ...node.pins[0]!, x }],
      }).success;
    expect([0, 100].map(at)).toEqual([true, true]);
    expect([-0.1, 100.1, NaN, Infinity, -Infinity].map(at)).toEqual(
      Array(5).fill(false)
    );
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

  it('budgets a pin title that wraps across the legend', () => {
    const titled = (title: string) =>
      placeholderExample.pins.map((pin) => ({ ...pin, title }));
    expect(legendStep(titled('Search'), openBody)).toBe('l');
    expect(
      legendStep(titled('Search filters the rows by store and date'), openBody)
    ).not.toBe('l');
  });

  it('steps the legend down as its layout shortens', () => {
    const at = (height: number) =>
      legendStep(placeholderExample.pins, { ...openBody, height });
    expect([759.5, 760].map(at)).toEqual(['m', 'l']);
    expect([615.5, 616].map(at)).toEqual(['s', 'm']);
    expect(legendStep(node.pins, openBody)).toBe('l');
    expect(legendStep(node.pins, { ...openBody, height: 254.5 })).toBe('m');
  });

  it('charges each legend line holding a code chip its padding and border', () => {
    const coded = placeholderExample.pins.map((pin) => ({
      ...pin,
      body: 'Calls `refund(id)` on click.',
    }));
    const plain = coded.map((pin) => ({
      ...pin,
      body: 'Calls refund on click.',
    }));
    const codeRise =
      2 * (scalePx(marks.codePaddingY) + scalePx(marks.codeBorder));
    const step = legendStep(coded, openBody);
    expect(legendStep(plain, openBody)).toBe(step);
    expect(
      legendHeight(coded, step, openBody.width) -
        legendHeight(plain, step, openBody.width)
    ).toBe(coded.length * codeRise);
  });

  it('places pins against the drawn slide when height limits its scale', () => {
    const { html } = runtime.surfaces.html.render({
      type: 'view',
      body: [
        {
          type: 'slideFrame',
          body: [tallestExample, example],
        } as PrimitiveNode,
      ],
    });
    const width = (handle: string) =>
      new RegExp(`class="[^"]*${handle}[^"]*" style="width:([\\d.]+)px`).exec(
        html
      )?.[1];
    const layout = {
      width: openBody.width,
      height: headingRoom(tallestExample),
    };
    expect(annotatedScale(example.render, layout)).toBeLessThan(
      trackWidth(layout.width, annotatedRenderShares, annotatedRender.gap) /
        slideWidth
    );
    expect(width('annotatedRender-stage')).toBeDefined();
    expect(width('annotatedRender-stage')).toBe(width('render-panel'));
  });
});
