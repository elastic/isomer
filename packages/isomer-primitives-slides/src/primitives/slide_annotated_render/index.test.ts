/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
  type SurfaceName,
  withNodeAnchors,
} from '@elastic/isomer-sdk';
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

  it('takes one to six pins', () => {
    const [pin] = placeholderExample.pins;
    const pinned = (count: number) =>
      slideAnnotatedRenderPrimitive.schema.safeParse({
        ...node,
        pins: Array(count).fill(pin),
      }).success;
    expect([0, 1, 6, 7].map(pinned)).toEqual([false, true, true, false]);
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

  it('reports a render that is not an object once', () => {
    expect(
      slideAnnotatedRenderPrimitive.schema
        .safeParse({ ...node, render: 'shot' })
        .error?.issues.map(({ path }) => path.join('.'))
    ).toEqual(['render']);
  });

  it('walks its render as its one child', () => {
    expect(slideAnnotatedRenderPrimitive.children?.(node)).toEqual([
      { node: node.render, path: 'render' },
    ]);
  });

  it('takes `id` and `surfaces` on its render, as on any node', () => {
    const render = { ...node.render, id: 'shot', surfaces: ['snapshot'] };
    const view = (annotated: object): Composition => ({
      type: 'view',
      body: [annotated as PrimitiveNode],
    });
    expect(
      slideAnnotatedRenderPrimitive.schema.safeParse({ ...node, render })
        .success
    ).toBe(true);
    expect(runtime.validate(view({ ...node, render })).errors).toEqual([]);
    expect(
      runtime
        .validate(view({ ...node, id: 'shot', render }))
        .errors.map(({ path }) => path)
    ).toEqual(['body[0].render.id']);
  });

  it('numbers the legend on every surface', () => {
    expect(runtime.surfaces.text.renderNode(node)).toMatchInlineSnapshot(`
      "orders-admin · snapshot

      1. Search — Filters by store and date.
      2. Export — Downloads the rows as CSV."
    `);
    expect(runtime.surfaces.markdown.renderNode(node)).toMatchInlineSnapshot(`
      "_orders-admin · snapshot_

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

  describe('with its render hidden from a surface', () => {
    const hiddenOn = (...surfaces: SurfaceName[]) => ({
      ...node,
      render: { ...node.render, surfaces },
    });
    const renderAnchors = (annotated: object) => {
      const sibling = { type: 'slideRender', slide: 'other', surface: 'text' };
      const composition: Composition = {
        type: 'view',
        body: [
          {
            type: 'slideFrame',
            body: [annotated, sibling],
          } as PrimitiveNode,
        ],
      };
      const markup = renderToStaticMarkup(
        runtime.surfaces.react.render(composition, {
          context: withNodeAnchors({}),
        })
      );
      return {
        markup,
        anchors:
          markup.split(`${NODE_ANCHOR_ATTRIBUTE}="slideRender"`).length - 1,
      };
    };

    it('draws only the legend on react, with one anchor per drawn render', () => {
      const shown = renderAnchors(node);
      expect(shown.anchors).toBe(2);
      expect(shown.markup).toContain(headline(node.render));
      const hidden = renderAnchors(hiddenOn('text'));
      expect(hidden.anchors).toBe(1);
      expect(hidden.markup).not.toContain(headline(node.render));
      expect(hidden.markup).toContain('Filters by store and date.');
    });

    it('starts text and Markdown at the legend', () => {
      expect(runtime.surfaces.text.renderNode(hiddenOn('react'))).toBe(
        '1. Search — Filters by store and date.\n2. Export — Downloads the rows as CSV.'
      );
      expect(runtime.surfaces.markdown.renderNode(hiddenOn('react'))).toBe(
        '1. **Search** — Filters by store and date.\n2. **Export** — Downloads the rows as CSV.'
      );
    });
  });

  it('bolds a pin title in Slack without the spaces around it', () => {
    const spaced = {
      ...node,
      pins: [{ ...node.pins[0]!, title: ' Search ' }],
    };
    expect(runtime.surfaces.slack.renderNode(spaced).blocks.at(-1)).toEqual({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '1. *Search* — Filters by store and date.',
      },
    });
  });

  it('draws the slide as wide as its column, or as tall as the room under its caption, less a pin on each side', () => {
    const inset = 2 * scalePx(annotatedRender.pin.overhang);
    const column =
      trackWidth(openBody.width, annotatedRenderShares, annotatedRender.gap) -
      inset;
    const { render: embedded } = placeholderExample;
    const caption = captionHeight(headline(embedded), column);
    expect(caption % 1).not.toBe(0);
    expect(annotatedScale(embedded, openBody)).toBeCloseTo(column / slideWidth);
    expect(annotatedScale(embedded, { ...openBody, height: 400 })).toBeCloseTo(
      (400 - inset - Math.ceil(caption)) / slideHeight
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
    expect([769.5, 770].map(at)).toEqual(['m', 'l']);
    expect([625.5, 626].map(at)).toEqual(['s', 'm']);
    expect(legendStep(node.pins, { ...openBody, height: 258 })).toBe('l');
    expect(legendStep(node.pins, { ...openBody, height: 257.5 })).toBe('m');
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
