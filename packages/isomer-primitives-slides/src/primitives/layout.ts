/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isVisibleOnSurface } from '@elastic/isomer-sdk';

import type { SlideLayout, SlideRenderContext } from '../render/context';
import { withContextFields } from '../render/context_view';
import {
  frame,
  frameBodyHeight,
  frameContentWidth,
} from '../theme/components/frame';
import { scalePx } from '../theme/scale';

import { headingHeight, referenceRoom } from './slide_heading/fit';
import type { SlideHeadingNode } from './slide_heading/schema';

/** A frame's body with nothing above it. */
export const openBody: SlideLayout = {
  width: frameContentWidth,
  height: frameBodyHeight,
};

/**
 * The layout `context` gives a node, and its `crowding`: {@link referenceRoom} over its height.
 * A load times its crowding is compared with a budget, so budgets hold at 1, below a two-line title and lede.
 */
export const slideLayout = (
  context: SlideRenderContext | undefined
): SlideLayout & { crowding: number } => {
  const { width, height } = context?.layout ?? openBody;
  return { width, height, crowding: referenceRoom / Math.max(1, height) };
};

/** `context` with `layout` for the nodes a container renders in it, never negative. */
export const withLayout = (
  context: SlideRenderContext | undefined,
  { width, height }: SlideLayout
): SlideRenderContext =>
  withContextFields(context, {
    layout: { width: Math.max(0, width), height: Math.max(0, height) },
  });

/** A surface that draws nodes; a container's nested nodes follow `react` on both. */
type DrawnSurface = 'react' | 'svg';

type LaidOutNode = { type: string; surfaces?: readonly string[] };

const isHeading = (node: LaidOutNode): node is SlideHeadingNode =>
  node.type === 'slideHeading';

/** The layout a body of nodes `gap` apart in `room` gives its node at `index`: all of `room`, or below a leading `slideHeading` the height it and its gap leave. Leading means first of the nodes `surface` shows. */
export const bodyLayout = (
  room: SlideLayout,
  gap: number,
  body: readonly LaidOutNode[],
  index: number,
  surface: DrawnSurface = 'react'
): SlideLayout => {
  const lead = body.findIndex((node) => isVisibleOnSurface(node, surface));
  const first = body[lead];
  return index > lead && first !== undefined && isHeading(first)
    ? {
        ...room,
        height: room.height - headingHeight(first, room.width) - gap,
      }
    : room;
};

/** {@link bodyLayout} for a frame body. */
export const frameBodyLayout = (
  body: readonly LaidOutNode[],
  index: number,
  surface: DrawnSurface = 'react'
): SlideLayout =>
  bodyLayout(openBody, scalePx(frame.bodyGap), body, index, surface);
