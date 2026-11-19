/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  SceneBase,
  SceneColor,
  SceneSelection,
  SceneSource,
  SceneTooltip,
} from '../../scene';
import type { PortableFormat } from '../../schema';

/** One position along a {@link HeatmapAxis}, in axis order. */
export interface HeatmapCategory {
  /** Epoch milliseconds on a time axis; else an opaque key unique on the axis. */
  readonly x: number | string;
  /** The position as the axis labels it. */
  readonly label: string;
}

/** One axis of a {@link HeatmapScene}. */
export interface HeatmapAxis {
  /** The column whose cells place cells along it; absent on a heat map with no `y`. */
  readonly column?: string;
  /** The column's label, for tooltips and descriptions. */
  readonly label: string;
  readonly title?: string;
  /** `time` places positions at their instants, `interval` apart; `ordinal` in `categories` order. */
  readonly scale: 'ordinal' | 'time';
  /** How a value on a time axis prints, through `formatAxisValue`. */
  readonly format: PortableFormat;
  /** On a time axis, the zone whose round times ticks fall on. */
  readonly timeZone?: string;
  /** On a time axis, each position's width in milliseconds. */
  readonly interval?: number;
  /** On a time axis, the instants it spans at least, positions or not: the node's `custom` domain. */
  readonly domain?: { readonly min: number; readonly max: number };
  readonly showLabels: boolean;
  /** Label rotation in degrees. */
  readonly labelRotation: 0 | -45 | -90;
  /** Every position with a row, in axis order: left to right, or top to bottom. */
  readonly categories: readonly HeatmapCategory[];
}

/** One drawn cell of a {@link HeatmapScene}: a row with a value. */
export interface HeatmapCell {
  /** The index of its position in `x.categories`. */
  readonly x: number;
  /** The index of its position in `y.categories`. */
  readonly y: number;
  readonly value: number;
  /** The value as displayed. */
  readonly valueText: string;
  /** The fill: its band's color, or transparent (`#FFFFFF00`) in no band. */
  readonly color: SceneColor;
  readonly source: SceneSource;
  /** The x and y positions and the value, for a tooltip. */
  readonly tooltip: SceneTooltip;
  /** What a selection of the cell describes, such as "host.name: web-01 · Count: 12". */
  readonly description: string;
  /** The `cell` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** One color band of a {@link HeatmapScene}, ascending: values from `start` (inclusive) to `end` (exclusive). */
export interface HeatmapBand {
  /** Absent: open below. */
  readonly start?: number;
  /** Absent: open above. */
  readonly end?: number;
  readonly color: SceneColor;
  /** The range as the legend writes it, such as "20 - 40" or "≥ 80". */
  readonly label: string;
}

/** A Scene of cells by x and y, colored by value. */
export interface HeatmapScene extends SceneBase {
  readonly kind: 'heatmap';
  readonly x: HeatmapAxis;
  /** One position with an empty label, and no labels, when the node has no `y`. */
  readonly y: HeatmapAxis;
  /** The value column's label: what the cells measure. */
  readonly valueLabel: string;
  /** In row order. */
  readonly cells: readonly HeatmapCell[];
  /** Ascending, without overlapping; every cell's color is its band's. */
  readonly bands: readonly HeatmapBand[];
  /** Write each cell's `valueText` in it, where it fits. */
  readonly cellLabels: boolean;
  readonly gridLines: { readonly width: number; readonly color: SceneColor };
  /** The legend lists `bands`. */
  readonly legend: {
    readonly visible: boolean;
    readonly position: 'top' | 'bottom' | 'left' | 'right';
    readonly maxLines: number;
    readonly size: 'auto' | 's' | 'm' | 'l' | 'xl';
  };
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: {
    readonly reason: 'noResults';
    readonly text: string;
  };
}
