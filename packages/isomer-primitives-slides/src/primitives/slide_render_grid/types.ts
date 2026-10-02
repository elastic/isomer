/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';

import type { BodyNode } from '../../body_node';
import type { SlideRenderSurface } from '../../theme/variants';

export interface SlideRenderGridTile {
  surface: SlideRenderSurface;
  /** What this surface is for, beside its name. */
  caption: string;
}

/** One body as several surfaces render it, in a grid. */
export interface SlideRenderGridNode extends PrimitiveNode {
  type: 'slideRenderGrid';
  /** What every tile renders. Not a walked child: its ids are its own. */
  body: readonly BodyNode[];
  /** Reading order; each surface once. */
  tiles: readonly SlideRenderGridTile[];
}
