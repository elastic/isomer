/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideLayout } from '../../render/context';
import {
  annotatedRender,
  annotatedRenderShares,
} from '../../theme/components/annotated_render';
import { scalePx } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { lineBox, marksHeight, measureText, trackWidth } from '../size';
import { scaleUnderCaption } from '../slide_render/fit';
import { headline } from '../slide_render/output';
import type { SlideRenderNode } from '../slide_render/types';

import type { SlideAnnotatedRenderPin } from './schema';

const column = (width: number, index: 0 | 1) =>
  trackWidth(width, annotatedRenderShares, annotatedRender.gap, index);

/** The scale `render` draws its slide at in the first column of `layout`. */
export const annotatedScale = (
  render: SlideRenderNode,
  { width, height }: SlideLayout
): number =>
  scaleUnderCaption(headline(render), { width: column(width, 0), height });

const { legend } = annotatedRender;

/** Height of the legend at `step` in the second column of `width`, its titles and text wrapped across it. */
export const legendHeight = (
  pins: readonly SlideAnnotatedRenderPin[],
  step: SlideSize,
  width: number
): number => {
  const textWidth = Math.max(
    0,
    column(width, 1) - scalePx(legend.marker) - scalePx(legend.columnGap)
  );
  const { padding, ...sizes } = legend.steps[step];
  const title = { ...legend.title, size: sizes.title };
  const body = { ...legend.body, size: sizes.body };
  const lines = (text: string, role: TypeRole & { lineHeight: ScaleToken }) =>
    Math.max(1, measureText(text, role, textWidth).lines) * lineBox(role);
  return pins.reduce(
    (height, { title: name, body: text }) =>
      height +
      2 * scalePx(padding) +
      lines(name, title) +
      scalePx(legend.textGap) +
      marksHeight(text, body, textWidth) +
      scalePx(legend.rule),
    scalePx(legend.rule)
  );
};

/** The largest legend step whose {@link legendHeight} fits the height of `layout`. */
export const legendStep = (
  pins: readonly SlideAnnotatedRenderPin[],
  { width, height }: SlideLayout
): SlideSize =>
  slideSizes.find((step) => legendHeight(pins, step, width) <= height) ?? 's';
