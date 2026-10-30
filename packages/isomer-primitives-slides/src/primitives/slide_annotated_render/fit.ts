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
import type { SlideSize } from '../../theme/variants';
import {
  lineBox,
  marksHeight,
  measureText,
  stepWhere,
  trackWidth,
} from '../size';
import { captionHeight, embeddedScale } from '../slide_render/fit';
import { headline } from '../slide_render/output';
import type { SlideRenderNode } from '../slide_render/types';

import type { SlideAnnotatedRenderPin } from './schema';
import type { SlideAnnotatedRenderNode } from './types';

const column = (width: number, index: 0 | 1) =>
  trackWidth(width, annotatedRenderShares, annotatedRender.gap, index);

const { legend, pin } = annotatedRender;

const innerWidth = (width: number) =>
  column(width, 0) - 2 * scalePx(pin.overhang);

/** How far the panel's top edge sits below the figure's: the caption, its gap, and a pin's overhang. */
export const panelOffset = (
  render: SlideRenderNode,
  { width }: Pick<SlideLayout, 'width'>
): number =>
  captionHeight(headline(render), innerWidth(width)) + scalePx(pin.overhang);

/** The scale `render` draws its slide at in the first column of `layout`, inset on every side by a pin's overhang. */
export const annotatedScale = (
  render: SlideRenderNode,
  layout: SlideLayout
): number =>
  embeddedScale({
    width: innerWidth(layout.width),
    height: layout.height - scalePx(pin.overhang) - panelOffset(render, layout),
  });

/** Height of the legend at `step` in the second column of `width`, its titles and text wrapped across it as drawn. */
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

/** The largest step whose legend, by {@link legendHeight}, fits the height of `layout`. */
export const annotatedRenderStep = (
  { pins }: Pick<SlideAnnotatedRenderNode, 'pins'>,
  { width, height }: SlideLayout
): SlideSize => stepWhere((step) => legendHeight(pins, step, width) <= height);

/** How far the legend drops to meet the panel's top edge, as far as the room below it allows. */
export const legendOffset = (
  render: SlideRenderNode,
  pins: readonly SlideAnnotatedRenderPin[],
  step: SlideSize,
  layout: SlideLayout
): number =>
  Math.max(
    0,
    Math.min(
      panelOffset(render, layout),
      layout.height - legendHeight(pins, step, layout.width)
    )
  );
