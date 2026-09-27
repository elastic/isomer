/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';

import type { SlideContentNode } from '../body_node';
import { slideFonts } from '../examples/fonts';
import { slideDeckFrame, slidesPack } from '../pack';
import { frame } from '../theme/components/frame';
import { scalePx } from '../theme/scale';
import type { SlideFrameTone } from '../theme/variants';

import type { SlideFrameNode } from './slide_frame/types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });

/** The right edge of the frame body's content on the canvas. */
export const contentRight = scalePx(frame.width) - scalePx(frame.paddingX);

interface Measured {
  x: number;
  width: number;
  runs: { x: number; width: number }[];
  children: Measured[];
}

const rightmostRun = ({ runs, children }: Measured): number =>
  Math.max(
    0,
    ...runs.map(({ x, width }) => x + width),
    ...children.map(rightmostRun)
  );

/** The rightmost edge of any text `node` draws on the image surface, alone in a frame. */
export const textRightEdge = async (
  node: SlideContentNode,
  tone: SlideFrameTone = 'page'
): Promise<number> => {
  const slide: SlideFrameNode = { type: 'slideFrame', tone, body: [node] };
  const composition: Composition = { type: 'view', body: [slide] };
  return rightmostRun(
    await takumi.measure(runtime.surfaces.svg.render(composition))
  );
};
