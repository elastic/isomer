/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The render's step and the legend's step, from their estimated heights against the room a two-line title and lede leave.

import type { ScaleToken } from '@elastic/distillate';

import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { regularAdvance } from '../../theme/base';
import {
  annotatedRender,
  annotatedRenderLegendWidth,
} from '../../theme/components/annotated_render';
import { render } from '../../theme/components/render';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { referenceRoom } from '../slide_heading/fit';

import type { SlideAnnotatedRenderPin } from './schema';

const lineHeight = ({
  size,
  lineHeight: leading,
}: {
  size: ScaleToken;
  lineHeight: ScaleToken;
}) => scalePx(size) * parseFloat(leading.value);

const [aspectWidth, aspectHeight] = render.panel.aspect.value
  .split('/')
  .map(Number) as [number, number];

const captionHeight = lineHeight(render.caption) + scalePx(render.captionGap);

/** The render and the caption line above it. */
export const renderStep = (crowding = 1): SlideSize =>
  slideSizes.find(
    (step) =>
      ((scalePx(annotatedRender.fits[step].width) * aspectHeight) /
        aspectWidth +
        captionHeight) *
        crowding <=
      referenceRoom
  ) ?? 's';

const { legend } = annotatedRender;

const legendHeight = (
  pins: readonly SlideAnnotatedRenderPin[],
  step: SlideSize
): number => {
  const { padding, title, body } = legend.steps[step];
  const bodyLine = scalePx(body) * parseFloat(legend.body.lineHeight.value);
  const charsPerLine =
    annotatedRenderLegendWidth / (regularAdvance * scalePx(body));
  return pins.reduce(
    (height, { body: text }) =>
      height +
      2 * scalePx(padding) +
      scalePx(title) * parseFloat(legend.title.lineHeight.value) +
      scalePx(legend.textGap) +
      Math.ceil(displayColumns(stripMarks(text)) / charsPerLine) * bodyLine +
      scalePx(legend.rule),
    scalePx(legend.rule)
  );
};

export const legendStep = (
  pins: readonly SlideAnnotatedRenderPin[],
  crowding = 1
): SlideSize =>
  slideSizes.find(
    (step) => legendHeight(pins, step) * crowding <= referenceRoom
  ) ?? 's';
