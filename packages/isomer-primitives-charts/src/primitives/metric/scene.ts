/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChartGlyph } from '../../glyphs';
import type {
  SceneBase,
  SceneColor,
  SceneSelection,
  SceneSource,
  SceneTooltip,
} from '../../scene/base';
import type { Cell } from '../../schema/data';

/** How a metric tile aligns its title and value. */
export type MetricAlignment = 'left' | 'center' | 'right';

/** How a metric Scene arranges its tiles. */
export interface MetricLayout {
  /** Tiles per row. */
  readonly columns: number;
  readonly rows: number;
  readonly density: 'compact' | 'default';
  readonly valuePosition: 'top' | 'middle' | 'bottom';
  readonly labelsAlignment: MetricAlignment;
  readonly valueAlignment: MetricAlignment;
  readonly valueSizing: 'auto' | 'fill';
  readonly secondaryAlignment: MetricAlignment;
  readonly icon?: {
    readonly name: ChartGlyph;
    readonly alignment: 'left' | 'right';
  };
}

/** One tile of a metric Scene: one row of `data`, with its colors and text resolved. */
export interface MetricTile {
  /** The tile's row and the columns it shows. */
  readonly source: SceneSource;
  readonly title: string;
  readonly subtitle?: string;
  readonly value: {
    readonly text: string;
    readonly raw: Cell;
    readonly color: SceneColor;
  };
  readonly background: SceneColor;
  readonly secondary?: {
    readonly label?: string;
    readonly labelPlacement: 'before' | 'after' | 'tooltip';
    readonly text: string;
    readonly color: SceneColor;
    readonly badge?: {
      readonly direction: 'increase' | 'decrease' | 'neutral';
      readonly color: SceneColor;
      readonly showIcon: boolean;
      /** The glyph drawn when `showIcon`: `↑`, `↓` or `=`. Absent when the difference is not a number. */
      readonly icon?: string;
    };
  };
  /** A helper mark: carries no source. */
  readonly progress?: {
    /** The value's share of the maximum, clamped to `[0, 1]`. */
    readonly fraction: number;
    readonly orientation: 'horizontal' | 'vertical';
    readonly color: SceneColor;
    readonly track: SceneColor;
  };
  /** A helper mark: carries no source. Points are in data space. */
  readonly trend?: {
    readonly points: readonly {
      readonly x: number;
      readonly y: number | null;
    }[];
    readonly xDomain: readonly [number, number];
    readonly yDomain: readonly [number, number];
    readonly color: SceneColor;
  };
  readonly tooltip: SceneTooltip;
  /** What a selection of the tile describes, such as "host.name: web-01 · Used: 412 GB". */
  readonly description: string;
  /** The `tile` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A Scene of metric tiles. */
export interface MetricScene extends SceneBase {
  readonly kind: 'metric';
  readonly layout: MetricLayout;
  /** In `data` order. */
  readonly tiles: readonly MetricTile[];
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}
