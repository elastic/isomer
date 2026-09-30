/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideLayout } from '../../render/context';
import { stripMarks } from '../../render/marks';
import {
  annotatedRender,
  annotatedRenderShares,
} from '../../theme/components/annotated_render';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { lineBox, proseLines, trackWidth, wrappedLines } from '../size';
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
  const { padding, title, body } = legend.steps[step];
  return pins.reduce(
    (height, { title: name, body: text }) =>
      height +
      2 * scalePx(padding) +
      wrappedLines(name, scalePx(title), textWidth, legend.title.tracking) *
        lineBox({ size: title, lineHeight: legend.title.lineHeight }) +
      scalePx(legend.textGap) +
      proseLines(stripMarks(text), scalePx(body), textWidth) *
        lineBox({ size: body, lineHeight: legend.body.lineHeight }) +
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
