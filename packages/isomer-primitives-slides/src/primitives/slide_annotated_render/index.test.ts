/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { resolveSlideRenders } from '../../resolve_renders';

import { checkoutSlide, example, examples } from './examples';
import type { SlideAnnotatedRenderNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: unknown): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const reference: SlideAnnotatedRenderNode = {
  ...example,
  render: { type: 'slideRender', slide: 'results', surface: 'svg' },
};

describe('slideAnnotatedRender', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(errorPaths(node)).toEqual([]);
    }
  });

  it('rejects a render nested in its render, once, where it sits', () => {
    const nested = {
      ...example,
      render: {
        ...example.render,
        composition: {
          type: 'view',
          body: [
            {
              type: 'slideFrame',
              body: [{ type: 'slideRender', slide: '01', surface: 'svg' }],
            },
          ],
        },
      },
    };
    expect(errorPaths(nested)).toEqual([
      'body[0].body[0].render.composition.body[0].body[0]: an embedded composition cannot embed another render',
    ]);
  });

  it('cannot itself sit inside an embedded composition', () => {
    const outer = {
      type: 'slideRender',
      surface: 'svg',
      composition: compose(example),
    };
    expect(errorPaths(outer)).toEqual([
      'body[0].body[0].composition.body[0].body[0]: an embedded composition cannot embed another render',
    ]);
  });

  it('needs one to six pins inside the render', () => {
    const pin = { x: 0, y: 100, title: 'Edge', body: 'A corner.' };
    expect(errorPaths({ ...example, pins: [] })).toHaveLength(1);
    expect(errorPaths({ ...example, pins: Array(7).fill(pin) })).toHaveLength(
      1
    );
    expect(errorPaths({ ...example, pins: [{ ...pin, x: 101 }] })).toHaveLength(
      1
    );
  });

  it('has its render filled in by resolveSlideRenders', () => {
    const [resolved] = resolveSlideRenders([
      { slug: 'anatomy', composition: compose(reference) },
      { slug: 'results', composition: checkoutSlide },
    ]);
    const [frame] = resolved!.body as unknown as [
      { body: [SlideAnnotatedRenderNode] },
    ];
    const { render } = frame.body[0];
    expect(render.composition).toBe(checkoutSlide);
  });

  it('lists the pins after the render in text and markdown', () => {
    const composition = compose(reference);
    expect(runtime.surfaces.text.render(composition)).toMatchInlineSnapshot(`
      "[svg render of slide results]

      1. Claim — The one sentence the audience should leave with.
      2. Evidence — Three numbers, each with the label that makes it mean something.
      3. Footer — Brand and section, the same on every slide."
    `);
    expect(runtime.surfaces.markdown.render(composition))
      .toMatchInlineSnapshot(`
      "_[svg render of slide results]_

      1. **Claim** — The one sentence the audience should leave with.
      2. **Evidence** — Three numbers, each with the label that makes it **mean** something.
      3. **Footer** — Brand and section, the same on every slide."
    `);
  });

  it('carries every pin to Slack', () => {
    const blocks = JSON.stringify(
      runtime.surfaces.slack.render(compose(example)).blocks
    );
    for (const { title } of example.pins) {
      expect(blocks).toContain(`*${title}*`);
    }
  });

  it('places each pin by percentage over the render', () => {
    const html = renderToStaticMarkup(
      runtime.surfaces.react.render(compose(reference))
    );
    for (const { x, y } of example.pins) {
      expect(html).toContain(`left:${x}%;top:${y}%`);
    }
    expect(html).toContain('slide results · svg');
  });
});
