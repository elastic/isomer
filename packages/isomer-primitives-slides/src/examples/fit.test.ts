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
  buildAuthoringJsonSchema,
  checkLayout,
  type Composition,
  createChildNodeWalker,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slidesPackAuthoring } from '../pack_authoring';
import { layoutCheckNote } from '../primitives/authored_text';
import { tallestExample as tallestHeading } from '../primitives/slide_heading/examples';
import { headingCrowding } from '../primitives/slide_heading/fit';
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

const findings = async (slide: Composition) => {
  const layout = await takumi.measure(
    runtime.surfaces.svg.render(slide, { anchors: true })
  );
  return [...checkLayout(layout, slide.body, walk, 'svg'), ...pastBody(layout)];
};

describe('every example fits its preview slide', () => {
  it.each(cases)('$name', async ({ slide }) => {
    expect(await findings(slide)).toEqual([]);
  });
});

const describesLayoutCheck = (
  primitive: (typeof slideDeckPrimitives)[number]
) =>
  JSON.stringify(
    buildAuthoringJsonSchema([primitive], slidesPackAuthoring)
  ).includes(layoutCheckNote);

// A primitive whose most content can overflow the tallest heading says so in its schema, so an author knows to run the check.
describe('under the tallest heading, every example fits or its schema notes the layout check', () => {
  // Crowding is 1 exactly for the two-line title and lede that load budgets are set against.
  it('measures under the heading load budgets are set against', () => {
    expect(headingCrowding(tallestHeading)).toBe(1);
  });

  it.each(
    slideDeckPrimitives.flatMap((primitive) =>
      primitive.examples.map((example, index) => ({
        name: `${primitive.type} #${index}`,
        primitive,
        slide: previewSlide(example as PrimitiveNode, tallestHeading),
      }))
    )
  )('$name', async ({ primitive, slide }) => {
    const found = await findings(slide);
    if (found.length > 0) {
      expect(describesLayoutCheck(primitive)).toBe(true);
    }
  });
});
