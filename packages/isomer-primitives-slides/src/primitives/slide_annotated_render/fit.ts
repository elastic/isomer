/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Picks the render's step and the legend's padding from their estimated
// heights, against the room a two-line title and lede leave.

import type { ScaleToken } from '@elastic/distillate';

import { stripMarks } from '../../render/marks';
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

const [aspectWidth = 16, aspectHeight = 9] = render.panel.aspect.value
  .split('/')
  .map(Number);

const captionHeight = lineHeight(render.caption) + scalePx(render.captionGap);

/** The largest step at which the render, and its caption, fit the room `crowding` leaves. */
export const renderStep = (captioned: boolean, crowding = 1): SlideSize =>
  slideSizes.find(
    (step) =>
      ((scalePx(annotatedRender.fits[step].width) * aspectHeight) /
        aspectWidth +
        (captioned ? captionHeight : 0)) *
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
      Math.ceil(stripMarks(text).length / charsPerLine) * bodyLine +
      scalePx(legend.rule),
    scalePx(legend.rule)
  );
};

/** The largest legend step whose rows fit the room `crowding` leaves. */
export const legendStep = (
  pins: readonly SlideAnnotatedRenderPin[],
  crowding = 1
): SlideSize =>
  slideSizes.find(
    (step) => legendHeight(pins, step) * crowding <= referenceRoom
  ) ?? 's';
