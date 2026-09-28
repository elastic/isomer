/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { deliverySlide } from '../primitives/slide_render/examples';
import { slideDeckPrimitives } from '../registry';
import { showSlideBuild, SLIDE_BUILDS, slideBuildParts, slideBuilds } from '.';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const slide = (...body: PrimitiveNode[]): Composition => ({
  type: 'view',
  title: 'Builds',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const mount = (composition: Composition, enhancements = [SLIDE_BUILDS]) => {
  const { html } = runtime.surfaces.html.render(composition, { enhancements });
  document.body.innerHTML = html;
  return document.body;
};

const visibility = (elements: Element[][]): string[] =>
  elements.map(([first]) => (first as HTMLElement).style.visibility);

const pipeline = {
  type: 'slidePipeline',
  steps: [{ title: 'Validate' }, { title: 'Dispatch' }, { title: 'Render' }],
} as PrimitiveNode;

const bullets = {
  type: 'slideBulletList',
  items: ['One', 'Two'],
} as PrimitiveNode;

describe('slide builds', () => {
  const examples = slideDeckPrimitives.flatMap(({ examples }) =>
    examples.map((node): Composition =>
      node.type === 'slideFrame'
        ? { type: 'view', title: 'Builds', body: [node] }
        : slide(node)
    )
  );

  it.each(
    examples.map((composition) => [composition.body[0]!.type, composition])
  )(
    'finds every part of every building node in a %s example',
    (_type, composition) => {
      const parts = slideBuildParts(mount(composition), composition);
      expect(parts.every(({ found }) => found)).toBe(true);
      expect(parts.reduce((total, { count }) => total + count, 0)).toBe(
        slideBuilds(composition)
      );
    }
  );

  it('renders no anchors for a slide with nothing to build', () => {
    const { html } = runtime.surfaces.html.render(
      slide({ type: 'slideHeading', title: 'Only a heading' } as PrimitiveNode),
      { enhancements: [SLIDE_BUILDS] }
    );
    expect(html).not.toContain('data-isomer-node');
  });

  it('renders no anchors unless builds are requested', () => {
    const { html } = runtime.surfaces.html.render(slide(pipeline));
    expect(html).not.toContain('data-isomer-node');
  });

  it('carries anchors on the React collection context when requested', () => {
    const { context } = runtime.surfaces.html.createStyleCollection(
      slide(pipeline),
      { enhancements: [SLIDE_BUILDS] }
    );
    expect(context.anchors).toBe(true);
  });

  it('reveals parts in reading order across primitives, and hides them again', () => {
    const composition = slide(pipeline, bullets);
    const root = mount(composition);
    const [steps, items] = slideBuildParts(root, composition);
    expect(slideBuilds(composition)).toBe(5);

    showSlideBuild(root, composition, 0);
    expect(visibility(steps!.units)).toEqual(['hidden', 'hidden', 'hidden']);
    expect(visibility(items!.units)).toEqual(['hidden', 'hidden']);

    showSlideBuild(root, composition, 4);
    expect(visibility(steps!.units)).toEqual(['', '', '']);
    expect(visibility(items!.units)).toEqual(['', 'hidden']);

    showSlideBuild(root, composition, 2);
    expect(visibility(steps!.units)).toEqual(['', '', 'hidden']);
    expect(visibility(items!.units)).toEqual(['hidden', 'hidden']);
  });

  it('shows again what an earlier call hid, whatever composition is now drawn', () => {
    const composition = slide(pipeline, bullets);
    const root = mount(composition);
    showSlideBuild(root, composition, 0);
    showSlideBuild(
      root,
      slide({ type: 'slideHeading', title: 'Next' } as PrimitiveNode),
      0
    );
    expect(
      [...root.querySelectorAll('li')].map(
        (item) => (item as HTMLElement).style.visibility
      )
    ).toEqual(['', '', '', '', '']);
  });

  it('never touches an embedded slide', () => {
    const embedded = slide({
      type: 'slideRender',
      composition: {
        ...deliverySlide,
        body: [{ type: 'slideFrame', body: [pipeline] } as PrimitiveNode],
      },
      surface: 'svg',
      caption: 'Embedded',
    } as PrimitiveNode);
    const root = mount(embedded);
    expect(slideBuilds(embedded)).toBe(0);
    showSlideBuild(root, embedded, 0);
    const hidden = [...root.querySelectorAll('li')].filter(
      (item) => (item as HTMLElement).style.visibility === 'hidden'
    );
    expect(hidden).toHaveLength(0);
  });

  it('builds each occurrence of a reused node object on its own', () => {
    const composition = slide(bullets, bullets);
    const root = mount(composition);
    const parts = slideBuildParts(root, composition);
    expect(parts.map(({ found }) => found)).toEqual([true, true]);
    expect(parts[0]!.units[0]![0]).not.toBe(parts[1]!.units[0]![0]);
    showSlideBuild(root, composition, 3);
    expect(visibility(parts[0]!.units)).toEqual(['', '']);
    expect(visibility(parts[1]!.units)).toEqual(['', 'hidden']);
  });

  it('leaves a node whole when its parts cannot be found, keeping later offsets', () => {
    const composition = slide(pipeline, bullets);
    const root = mount(composition);
    root
      .querySelector('[data-isomer-node="slidePipeline"]')!
      .removeAttribute('data-isomer-node');
    showSlideBuild(root, composition, 4);
    const [steps, items] = slideBuildParts(root, composition);
    expect(steps!.found).toBe(false);
    expect(
      [...root.querySelectorAll('li')]
        .slice(0, 3)
        .map((item) => (item as HTMLElement).style.visibility)
    ).toEqual(['', '', '']);
    expect(visibility(items!.units)).toEqual(['', 'hidden']);
  });
});
