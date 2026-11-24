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
} from '../../scene';
import type { PortableFormat } from '../../schema';

/** An xy Scene's axis: the category axis, or the primary or secondary value axis. */
export type AxisId = 'x' | 'y' | 'y2';

/** Where a continuous axis's domain comes from. An engine computes it. */
export type SceneDomain =
  | {
      readonly kind: 'data';
      /** Extend the data's extent to include zero, before a fixed `min` replaces its lower end or a fixed `max` its upper end. */
      readonly includeZero: boolean;
      /** Round the domain out to readable values. */
      readonly rounding: boolean;
      /** The one end a y axis fixes, exactly; the other comes from the data. */
      readonly min?: number;
      /** The one end a y axis fixes, exactly; the other comes from the data. */
      readonly max?: number;
    }
  | { readonly kind: 'custom'; readonly min: number; readonly max: number };

/** One axis of an xy Scene, stated as intent: the engine chooses its ticks from `format` and `domain`. */
export interface SceneAxis {
  readonly id: AxisId;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  readonly scale: 'ordinal' | 'time' | 'linear' | 'log' | 'sqrt';
  /** How a value on the axis prints, through `formatAxisValue`. */
  readonly format: PortableFormat;
  /** On a time axis, the zone whose round times ticks fall on. */
  readonly timeZone?: string;
  /** Absent on an ordinal axis, whose positions are the Scene's `categories` in order. */
  readonly domain?: SceneDomain;
  /** On a continuous x axis, the bucket width the node states, in axis units; an engine sizes bars by it. */
  readonly interval?: number;
  readonly title?: string;
  readonly showTicks: boolean;
  readonly showGrid: boolean;
  /** Tick label rotation in degrees; 0 on an axis with `twoRows`. */
  readonly labelRotation: 0 | -45 | -90;
  /**
   * On a vertical chart's time x axis, draw Lens's two-row time axis, whose
   * ticks and labels the engine chooses. Absent where Elastic Charts' rasters
   * cannot label the axis ([Scene](../../docs/scene.md)).
   */
  readonly twoRows?: true;
}

/** One drawn datum: a point, a bar or an area vertex. */
export interface XyMark {
  readonly source: SceneSource;
  /** In data space: epoch milliseconds or a number, or a category on an ordinal axis. */
  readonly x: number | string;
  /** The value, unstacked; `null` is a gap. */
  readonly y: number | null;
  /** The value as displayed, such as in a bar label or tooltip. */
  readonly label: string;
  readonly description: string;
  /** The mark's bucket crosses an edge of the queried range. Its width is the x axis's `interval`, unless its layer's smallest x spacing is narrower. */
  readonly partial?: boolean;
  /** The `datum` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** One x position with data, in axis order. */
export interface XyCategory {
  /** As marks place it: epoch milliseconds, a number, or a category. */
  readonly x: number | string;
  /** The position as the x axis formats it. */
  readonly label: string;
  /** The `category` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** One drawn series of an xy Scene, with its mark, axis, color and stack group. */
export interface XySeries {
  /** The source data layer and y entry, uniquely identifying this series in its node. */
  readonly series: {
    readonly layer: number;
    readonly y: number;
  };
  /** The series key, as `colors.byKey` names it. */
  readonly key: string;
  readonly label: string;
  readonly mark: 'line' | 'area' | 'bar';
  readonly axis: 'y' | 'y2';
  readonly color: SceneColor;
  /** Series in one stack group stack on each other; the engine stacks them. */
  readonly stack?: {
    readonly group: string;
    readonly mode: 'stacked' | 'percentage';
  };
  readonly interpolation: 'linear' | 'smooth' | 'stepped';
  readonly fitting: {
    readonly kind:
      | 'none'
      | 'zero'
      | 'linear'
      | 'carry'
      | 'lookahead'
      | 'average'
      | 'nearest';
    readonly emphasize: boolean;
    readonly extend: 'none' | 'zero' | 'nearest';
  };
  /** On `auto`, the engine shows points where marks are far enough apart. */
  readonly points: 'auto' | 'visible' | 'hidden';
  readonly areaOpacity: number;
  readonly areaFill: 'solid' | 'gradient';
  readonly valueLabels: boolean;
  /** The cells the whole series represents, for a series or legend selection. */
  readonly source: SceneSource;
  /** The `series` selection, when the node offers it. */
  readonly selection?: SceneSelection;
  /** In x order. */
  readonly marks: readonly XyMark[];
}

/** One legend entry, in legend order. */
export interface SceneLegendItem {
  /** The source data layer and y entry, uniquely identifying this series in its node. */
  readonly series: {
    readonly layer: number;
    readonly y: number;
  };
  readonly key: string;
  readonly label: string;
  readonly color: SceneColor;
  readonly hidden: boolean;
  /** Formatted statistics, in the order the node asks for them. */
  readonly statistics: readonly {
    readonly name: string;
    readonly value: string;
  }[];
  readonly source: SceneSource;
  readonly description: string;
  /** The `legend` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** An xy Scene's legend: placement, sizing and items. */
export interface SceneLegend {
  readonly visible: boolean;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  readonly inside?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  readonly layout: 'grid' | 'list';
  readonly columns?: number;
  readonly maxLines: number;
  readonly size: 'auto' | 's' | 'm' | 'l' | 'xl';
  readonly header?: string;
  readonly items: readonly SceneLegendItem[];
}

/** A helper mark: carries no source. */
export interface SceneReferenceLine {
  readonly axis: AxisId;
  readonly value: number;
  readonly label?: string;
  readonly color: SceneColor;
  readonly fill?: 'above' | 'below';
  readonly icon?: ChartGlyph;
  readonly strokeWidth: number;
  readonly strokeDash: 'solid' | 'dashed' | 'dotted';
  readonly textPosition: 'auto' | 'left' | 'right';
}

/** A helper mark: carries no source. Times are epoch milliseconds. */
export type SceneAnnotation =
  | {
      readonly kind: 'point';
      readonly at: number;
      readonly label?: string;
      readonly text?: string;
      readonly color: SceneColor;
      readonly icon?: ChartGlyph;
      readonly line?: {
        readonly width: number;
        readonly dash: 'solid' | 'dashed' | 'dotted';
      };
      readonly tooltip: SceneTooltip;
    }
  | {
      readonly kind: 'range';
      readonly from: number;
      readonly to: number;
      readonly label?: string;
      readonly color: SceneColor;
      readonly fill: 'inside' | 'outside';
      readonly tooltip: SceneTooltip;
    };

/** One entry in an xy Scene's draw order: a series, a reference line or an annotation. */
export type XySceneLayer =
  | { readonly kind: 'series'; readonly series: XySeries }
  | { readonly kind: 'referenceLine'; readonly line: SceneReferenceLine }
  | { readonly kind: 'annotation'; readonly annotation: SceneAnnotation };

/** A Scene of lines, areas and bars on shared axes. */
export interface XyScene extends SceneBase {
  readonly kind: 'xy';
  readonly orientation: 'vertical' | 'horizontal';
  readonly axes: {
    readonly x: SceneAxis;
    readonly y?: SceneAxis;
    readonly y2?: SceneAxis;
  };
  /** Every x position with data, in axis order. */
  readonly categories: readonly XyCategory[];
  /** Resolved series and helper marks in the chart's exact cross-kind draw order. */
  readonly layers: readonly XySceneLayer[];
  readonly legend: SceneLegend;
  readonly barMinimumHeight: number;
  /** A helper mark: the current-time marker, in epoch milliseconds. */
  readonly currentTime?: number;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}
