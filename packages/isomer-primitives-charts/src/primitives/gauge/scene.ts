/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SceneBase, SceneColor } from '../../scene/base';
import type { PortableFormat } from '../../schema/format';

/** The shapes a {@link GaugeScene} draws. */
export type GaugeSceneShape =
  'horizontalBullet' | 'verticalBullet' | 'semiCircle' | 'arc' | 'circle';

/** One colored stretch of a {@link GaugeScene}'s scale, from `start` to `end`. */
export interface GaugeBand {
  readonly start: number;
  readonly end: number;
  /** Transparent (`#FFFFFF00`) where no band of the node covers it. */
  readonly color: SceneColor;
}

/** A Scene of one value on a scale: a bullet or a round dial. */
export interface GaugeScene extends SceneBase {
  readonly kind: 'gauge';
  readonly shape: GaugeSceneShape;
  /** Absent when `empty`. */
  readonly value?: number;
  /** `value` as displayed. */
  readonly valueText: string;
  /** The scale, `min` below `max`. */
  readonly min: number;
  readonly max: number;
  /** How a value on the scale prints, through `formatAxisValue`. */
  readonly format: PortableFormat;
  /** The goal marker, present only where it falls on the scale. */
  readonly goal?: { readonly value: number; readonly text: string };
  /** Drawn on the gauge: the title (empty for none) and the subtitle. */
  readonly labels: { readonly major: string; readonly minor?: string };
  /** What a tooltip calls the hovered value, the value and the goal. */
  readonly tooltipLabels: {
    readonly active: string;
    readonly value: string;
    readonly goal: string;
  };
  /** Contiguous, ascending, from `min` to `max`. */
  readonly bands: readonly GaugeBand[];
  /** Where ticks go, ascending; absent lets the engine choose; empty draws none. */
  readonly ticks?: readonly number[];
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: {
    readonly reason: 'noResults' | 'equalBounds' | 'invertedBounds';
    readonly text: string;
  };
}
