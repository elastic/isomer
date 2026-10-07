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
import { previewFooter } from './preview_slide';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });
const walk = createChildNodeWalker(runtime.primitives);

/** A frame holding `body`, with the footer every preview carries. */
export const slideOf = (...body: object[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', ...previewFooter, body } as PrimitiveNode],
});

/** Takumi's measure of `slide`, with node anchors on. */
export const measured = (slide: Composition): Promise<LayoutBox> =>
  takumi.measure(runtime.surfaces.snapshot.render(slide, { anchors: true }));

/** What `checkLayout` finds in takumi's measure of `slide`. */
export const findings = async (slide: Composition) =>
  checkLayout(await measured(slide), slide.body, walk, 'snapshot');

const anchored = (box: LayoutBox, type: string): LayoutBox | undefined =>
  box.attributes?.[NODE_ANCHOR_ATTRIBUTE] === type
    ? box
    : box.children.reduce<LayoutBox | undefined>(
        (found, child) => found ?? anchored(child, type),
        undefined
      );

/** The first box in `layout` anchored to a node of `type`. */
export const nodeBox = (layout: LayoutBox, type: string): LayoutBox => {
  const found = anchored(layout, type);
  if (found === undefined) {
    throw new Error(`no ${type} in the measured layout`);
  }
  return found;
};

/** The first box in `layout` with a text run holding `text`. */
export const textBox = (layout: LayoutBox, text: string): LayoutBox => {
  const holding = (box: LayoutBox): LayoutBox | undefined =>
    box.runs.some((run) => run.text.includes(text))
      ? box
      : box.children.reduce<LayoutBox | undefined>(
          (found, child) => found ?? holding(child),
          undefined
        );
  const found = holding(layout);
  if (found === undefined) {
    throw new Error(`no run holding ${text} in the measured layout`);
  }
  return found;
};
