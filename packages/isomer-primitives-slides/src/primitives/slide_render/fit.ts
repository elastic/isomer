/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideLayout } from '../../render/context';
import { frame } from '../../theme/components/frame';
import { render } from '../../theme/components/render';
import { scalePx } from '../../theme/scale';
import { lineBox, monoLines } from '../size';

import { headline } from './output';
import type { SlideRenderNode } from './types';

const slideWidth = scalePx(frame.width);
const slideHeight = scalePx(frame.height);

/** A render's caption wrapped across `width`, and the gap below it. */
export const captionHeight = (caption: string, width: number): number =>
  monoLines(caption, scalePx(render.caption.size), width) *
    lineBox(render.caption) +
  scalePx(render.captionGap);

/** The scale that fits a whole slide in `room`, no larger than `cap`. */
export const embeddedScale = (
  { width, height }: SlideLayout,
  cap?: ScaleToken
): number =>
  Math.max(
    0,
    Math.min(
      cap ? parseFloat(cap.value) : Infinity,
      width / slideWidth,
      height / slideHeight
    )
  );

/** Width in pixels of a slide drawn at `scale`. */
export const scaledWidth = (scale: number): number => slideWidth * scale;

/** Height in pixels of a slide drawn at `scale`. */
export const scaledHeight = (scale: number): number => slideHeight * scale;

/** The scale that fits a whole slide under `caption` in `layout`, no larger than `cap`; the caption wraps at the drawn slide's width. */
export const scaleUnderCaption = (
  caption: string,
  { width, height }: SlideLayout,
  cap?: ScaleToken
): number => {
  const at = (captionWidth: number) =>
    embeddedScale(
      { width, height: height - captionHeight(caption, captionWidth) },
      cap
    );
  return at(scaledWidth(at(width)));
};

/** The scale a `slideRender` draws its slide at in `layout`. */
export const renderScale = (
  node: SlideRenderNode,
  layout: SlideLayout
): number => scaleUnderCaption(headline(node), layout, render.maxScale);
