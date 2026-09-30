/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  checkLayout,
  type Composition,
  createChildNodeWalker,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import {
  example as headingExample,
  tallestExample,
} from '../primitives/slide_heading/examples';
import { slideDeckPrimitives } from '../registry';

import { slideFonts } from './fonts';
import { previewSlide } from './preview_slide';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });
const walk = createChildNodeWalker(runtime.primitives);

// Sub-pixel rounding reads as overflow without it.
const tolerance = 1;

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.map((example, index) => ({
    name: `${type} #${index}`,
    slide: previewSlide(example as PrimitiveNode),
  }))
);

const descendants = (box: LayoutBox): LayoutBox[] =>
  box.children.flatMap((child) => [child, ...descendants(child)]);

// `checkLayout` bounds a top-level node by the frame's whole canvas, so this also holds it to the frame's body, above the footer.
const pastBody = (layout: LayoutBox): LayoutBox[] => {
  const frame = [layout, ...descendants(layout)].find(
    ({ attributes }) => attributes?.[NODE_ANCHOR_ATTRIBUTE] === 'slideFrame'
  );
  const body = frame?.children[0]?.children[0];
  if (body === undefined) {
    throw new Error('no frame body in the measured layout');
  }
  return descendants(body).filter(
    ({ x, y, width, height }) =>
      width > 0 &&
      height > 0 &&
      (x < body.x - tolerance ||
        y < body.y - tolerance ||
        x + width > body.x + body.width + tolerance ||
        y + height > body.y + body.height + tolerance)
  );
};

describe('every example fits its preview slide', () => {
  it.each(cases)('$name', async ({ slide }) => {
    const layout = await takumi.measure(
      runtime.surfaces.svg.render(slide, { anchors: true })
    );
    expect(checkLayout(layout, slide.body, walk, 'svg')).toEqual([]);
    expect(pastBody(layout)).toEqual([]);
  });
});

const fits = async (slide: Composition): Promise<boolean> => {
  const layout = await takumi.measure(
    runtime.surfaces.svg.render(slide, { anchors: true })
  );
  return (
    checkLayout(layout, slide.body, walk, 'svg').length === 0 &&
    pastBody(layout).length === 0
  );
};

const inFrame = (body: PrimitiveNode[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const placements: [string, (node: PrimitiveNode) => Composition][] = [
  ['under the tallest heading', (node) => inFrame([tallestExample, node])],
  [
    'as a title aside',
    (node) =>
      inFrame([
        { type: 'slideTitle', title: 'Isomer', aside: node } as PrimitiveNode,
      ]),
  ],
  [
    'in a split pane',
    (node) =>
      inFrame([
        headingExample,
        {
          type: 'slideSplit',
          panes: [
            { label: 'Pane', items: [node] },
            { items: [{ type: 'slideBulletList', items: ['One', 'Two'] }] },
          ],
        } as PrimitiveNode,
      ]),
  ],
];

// Sized by `sizeForWidthLoad`, which reads the heading's crowding and the pane's width.
const widthLoaded = new Set(['slideGraph', 'slideRoadmap', 'slideTimeline']);

interface SizedCase {
  name: string;
  node: PrimitiveNode;
  place: (node: PrimitiveNode) => Composition;
}

const sized: SizedCase[] = slideDeckPrimitives
  .filter(({ type }) => widthLoaded.has(type))
  .flatMap(({ type, examples }) =>
    examples.flatMap((example, index) =>
      placements.map(([where, place]) => ({
        name: `${type} #${index} ${where}`,
        node: example,
        place,
      }))
    )
  );

describe('a picked size fits wherever the smallest does', () => {
  it.each(sized)('$name', async ({ node, place }) => {
    if (await fits(place({ ...node, size: 's' } as PrimitiveNode))) {
      expect(await fits(place(node))).toBe(true);
    }
  });
});
