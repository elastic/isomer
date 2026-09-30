/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { monoAdvance } from '../../theme/base';
import { frameContentWidth } from '../../theme/components/frame';
import { layers as theme, layersFit } from '../../theme/components/layers';
import { label, tone as toneCue } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import { emWidth, packedLines, proseLines, sizeForLoad } from '../size';

import type { SlideLayer, SlideLayersNode } from './schema';

const { band, chip } = theme;

const ownerWidth = ({ owner, tone }: SlideLayer): number =>
  Math.max(
    scalePx(theme.ownerColumn),
    emWidth(owner.toUpperCase(), label.tracking) * scalePx(label.size) +
      (tone ? scalePx(toneCue.cue.size) + scalePx(toneCue.cue.gap) : 0)
  );

const chipWidth = (text: string, step: SlideSize): number =>
  displayColumns(text) * monoAdvance * scalePx(theme.chipSizes[step]) +
  2 * (scalePx(chip.paddingX) + scalePx(chip.border));

/** Lines of body text or rows of chips `layer` takes at `step` in a band `width` wide. */
const layerLines = (
  layer: SlideLayer,
  step: SlideSize,
  width: number
): number => {
  const { body = '', chips } = layer;
  const inner =
    width -
    2 * (scalePx(band.border) + scalePx(band.paddingX[step])) -
    scalePx(theme.nameColumn) -
    ownerWidth(layer);
  return chips
    ? packedLines(
        chips.map((text) => chipWidth(text, step)),
        scalePx(theme.chipGap),
        inner
      )
    : proseLines(stripMarks(body), scalePx(theme.bodySizes[step]), inner);
};

/** Lines across every band at `step`. */
export const layersLoad = (
  { layers }: Pick<SlideLayersNode, 'layers'>,
  step: SlideSize,
  width = frameContentWidth
): number =>
  layers.reduce((total, layer) => total + layerLines(layer, step, width), 0);

/** The step a layer stack draws at in `context`. */
export const layersStep = (
  node: SlideLayersNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const { width, crowding } = slideLayout(context);
  return sizeForLoad(
    node.size,
    (step) => layersLoad(node, step, width),
    layersFit,
    crowding
  );
};
