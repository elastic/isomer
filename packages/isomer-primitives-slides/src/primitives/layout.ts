/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout, SlideRenderContext } from '../render/context';
import { withContextFields } from '../render/context_view';
import { frameBodyHeight, frameContentWidth } from '../theme/components/frame';

import { headingRoom, referenceRoom } from './slide_heading/fit';
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

const isHeading = (node: { type: string }): node is SlideHeadingNode =>
  node.type === 'slideHeading';

/** The layout a frame body gives its node at `index`: the whole body, or below a leading `slideHeading` the height it leaves. */
export const frameBodyLayout = (
  body: readonly { type: string }[],
  index: number
): SlideLayout => {
  const [first] = body;
  return index > 0 && first !== undefined && isHeading(first)
    ? { ...openBody, height: headingRoom(first) }
    : openBody;
};
