/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideRenderContext } from '../../render/context';
import { layers as theme } from '../../theme/components/layers';
import { label, tone as toneCue } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  brokenLines,
  codeGrowth,
  emWidth,
  markedLines,
  monoWidth,
  packedLines,
} from '../size';

import type { SlideLayer, SlideLayersNode } from './schema';

const { band, chip } = theme;

const lineHeight = (
  size: ScaleToken,
  { lineHeight: leading }: { lineHeight: ScaleToken }
): number => scalePx(size) * parseFloat(leading.value);

const ownerWidth = ({ owner, tone }: SlideLayer): number =>
  scalePx(theme.ownerGap) +
  Math.max(
    scalePx(theme.ownerColumn),
    emWidth(owner.toUpperCase(), label.tracking) * scalePx(label.size) +
      (tone ? scalePx(toneCue.cue.size) + scalePx(toneCue.cue.gap) : 0)
  );

const chipWidth = (text: string, step: SlideSize): number =>
  monoWidth(text, theme.chipSizes[step]) +
  2 * (scalePx(chip.paddingX) + scalePx(chip.border));

/** The height `layer`'s band takes at `step` in a stack `width` wide: its padding and border around its name, body lines, or chip rows, whichever is tallest. Unbounded where a chip outgrows its column. */
const bandHeight = (
  layer: SlideLayer,
  step: SlideSize,
  width: number
): number => {
  const { name, body = '', chips } = layer;
  const inner =
    width -
    2 * (scalePx(band.border) + scalePx(band.paddingX[step])) -
    scalePx(theme.nameColumn) -
    ownerWidth(layer);
  const widths = (chips ?? []).map((text) => chipWidth(text, step));
  if (widths.some((chipped) => chipped > inner)) {
    return Infinity;
  }
  const rows = packedLines(widths, scalePx(theme.chipGap), inner);
  const lines = markedLines(body, scalePx(theme.bodySizes[step]), inner);
  const content = chips
    ? rows *
        (lineHeight(theme.chipSizes[step], chip.type) +
          2 * (scalePx(chip.paddingY) + scalePx(chip.border))) +
      (rows - 1) * scalePx(theme.chipGap)
    : lines * lineHeight(theme.bodySizes[step], theme.body) +
      codeGrowth(body, lines);
  const named =
    brokenLines(
      name,
      scalePx(theme.nameSizes[step]),
      scalePx(theme.nameColumn),
      theme.name.tracking
    ) * lineHeight(theme.nameSizes[step], theme.name);
  return (
    2 * (scalePx(band.border) + scalePx(band.paddingY[step])) +
    Math.max(content, named)
  );
};

/** The height the stack takes at `step` across `width`. */
export const layersHeight = (
  { layers }: Pick<SlideLayersNode, 'layers'>,
  step: SlideSize,
  width: number
): number =>
  layers.reduce((total, layer) => total + bandHeight(layer, step, width), 0) +
  scalePx(theme.gaps[step]) * (layers.length - 1);

/** The node's own `size`, else the largest step at which the stack fits its layout's height; `s` when none does. */
export const layersStep = (
  node: SlideLayersNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const { width, height } = slideLayout(context);
  return (
    node.size ??
    slideSizes.find((step) => layersHeight(node, step, width) <= height) ??
    's'
  );
};
