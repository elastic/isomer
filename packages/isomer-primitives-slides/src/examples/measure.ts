/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  checkLayout,
  type Composition,
  createChildNodeWalker,
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

/** What `checkLayout` finds in takumi's measure of `slide`. */
export const findings = async (slide: Composition) =>
  checkLayout(
    await takumi.measure(runtime.surfaces.svg.render(slide, { anchors: true })),
    slide.body,
    walk,
    'svg'
  );
