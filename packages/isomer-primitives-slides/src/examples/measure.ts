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

import { slideDeckFrame, slidesPack } from '../pack';

import { slideFonts } from './fonts';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });
const walk = createChildNodeWalker(runtime.primitives);

// Sub-pixel rounding reads as overflow without it.
const tolerance = 1;

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

/** A frame holding `body`, with the footer every preview carries. */
export const slideOf = (...body: object[]): Composition => ({
  type: 'view',
  body: [
    {
      type: 'slideFrame',
      brand: 'Isomer',
      section: 'Preview',
      sectionNumber: '01',
      url: 'https://elastic.github.io/isomer',
      body,
    } as PrimitiveNode,
  ],
});

/** What takumi measures running past the canvas, overlapping, or past the frame body. */
export const layoutFindings = async (slide: Composition) => {
  const layout = await takumi.measure(
    runtime.surfaces.svg.render(slide, { anchors: true })
  );
  return {
    checkLayout: checkLayout(layout, slide.body, walk, 'svg'),
    pastBody: pastBody(layout),
  };
};

export const noFindings = { checkLayout: [], pastBody: [] };
