/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';
import type { SlideRenderSurface } from '../../theme/variants';

/** One tile of a {@link SlideRenderGridNode}. */
export interface SlideRenderGridTile {
  /** The surface this tile renders on. */
  surface: SlideRenderSurface;
  /** What this surface is for, beside its name. */
  caption: string;
}

/** One composition as several surfaces render it, in a grid. */
export interface SlideRenderGridNode extends PrimitiveNode {
  /** Discriminator. Always `slideRenderGrid`. */
  type: 'slideRenderGrid';
  /** What every tile renders. */
  composition: Composition<BodyNode>;
  /** Tiles in reading order. Two to six, each surface once. */
  tiles: SlideRenderGridTile[];
}
