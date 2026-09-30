/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideLayout } from '../../render/context';
import { stripMarks } from '../../render/marks';
import {
  annotatedRender,
  annotatedRenderShares,
} from '../../theme/components/annotated_render';
import { scalePx } from '../../theme/scale';
import type { TypeRole } from '../../theme/type_role';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { lineBox, measureText, trackWidth } from '../size';
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

const legendHeight = (
  pins: readonly SlideAnnotatedRenderPin[],
  step: SlideSize,
  textWidth: number
): number => {
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
      lines(stripMarks(text), body) +
      scalePx(legend.rule),
    scalePx(legend.rule)
  );
};

/** The largest legend step whose rows fit the height of `layout`, their titles and text wrapped across its second column. */
export const legendStep = (
  pins: readonly SlideAnnotatedRenderPin[],
  { width, height }: SlideLayout
): SlideSize => {
  const textWidth = Math.max(
    0,
    column(width, 1) - scalePx(legend.marker) - scalePx(legend.columnGap)
  );
  return (
    slideSizes.find((step) => legendHeight(pins, step, textWidth) <= height) ??
    's'
  );
};
