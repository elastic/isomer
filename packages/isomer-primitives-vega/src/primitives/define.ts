/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type DefaultPackTypes,
  definePrimitiveFor,
  type StyledRenderContext,
  type SurfaceMap,
} from '@elastic/isomer-sdk';

import type { VegaScheme } from '../theme';

/** The render context the `vega` primitive reads. Every field is optional. */
export interface VegaRenderContext extends StyledRenderContext {
  /** Absent: the frame theme's `scheme` on `snapshot`, else `light`. */
  readonly scheme?: VegaScheme;
  /** The box a container gives the chart, its link line included. Absent: the node's size, else 480 × 270. */
  readonly size?: { readonly width: number; readonly height: number };
}

export interface VegaPackTypes extends DefaultPackTypes {
  context: VegaRenderContext;
}

export const definePrimitive = definePrimitiveFor<VegaPackTypes>();

/** The `env` argument the `react` renderer receives. */
export type VegaReactEnv = SurfaceMap<VegaPackTypes>['react']['env'];
