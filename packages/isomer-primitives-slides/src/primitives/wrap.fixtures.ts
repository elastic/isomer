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
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import { slideFonts } from '../examples/fonts';
import { slideDeckFrame, slidesPack } from '../pack';
import { frame } from '../theme/components/frame';
import { scalePx } from '../theme/scale';

export const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });

/** The right edge of the frame body's content on the canvas. */
export const contentRight = scalePx(frame.width) - scalePx(frame.paddingX);

const isScaled = ({ scale }: LayoutBox): boolean => Math.abs(scale - 1) > 0.001;

// A line's trailing space hangs past its box, so only the run's visible text counts.
const visibleRight = ({ text, x, width }: LayoutBox['runs'][number]): number =>
  x + (width * text.trimEnd().length) / Math.max(text.length, 1);

// A scaled box is a picture of another render, clipped by its panel, so its text is not searched.
const rightmostRun = ({ runs, children }: LayoutBox): number =>
  Math.max(
    0,
    ...runs.map(visibleRight),
    ...children.filter((child) => !isScaled(child)).map(rightmostRun)
  );

/** `node` alone in a frame, unless it is one. */
export const inFrame = (node: PrimitiveNode): PrimitiveNode => {
  if (node.type === 'slideFrame') {
    return node;
  }
  const frame = { type: 'slideFrame', body: [node] };
  return frame;
};

/** The rightmost edge of any text `node` draws on the image surface, alone in a frame unless it is one. */
export const textRightEdge = async (node: PrimitiveNode): Promise<number> => {
  const composition: Composition = { type: 'view', body: [inFrame(node)] };
  return rightmostRun(
    await takumi.measure(runtime.surfaces.svg.render(composition))
  );
};
