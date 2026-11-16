/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { Position } from '@elastic/charts';
import {
  cls,
  type SceneRenderEnv,
} from '@elastic/isomer-primitives-charts/scene';

import { elasticModule } from './styles';

export const POSITION = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
} as const;

/** Kibana's `LegendSizeToPixels`. */
export const LEGEND_SIZE = {
  auto: undefined,
  s: 80,
  m: 130,
  l: 180,
  xl: 230,
} as const;

/** A legend item's "Filter for" and "Filter out" buttons; `select` takes whether the filter negates. */
export const legendActionButtons = (
  env: SceneRenderEnv,
  label: string,
  select: (negate: boolean) => void
): ReactNode => (
  <span className={cls(env, elasticModule.handles.legendAction)}>
    <button
      type="button"
      aria-label={`Filter for ${label}`}
      onClick={() => select(false)}>
      +
    </button>
    <button
      type="button"
      aria-label={`Filter out ${label}`}
      onClick={() => select(true)}>
      −
    </button>
  </span>
);
