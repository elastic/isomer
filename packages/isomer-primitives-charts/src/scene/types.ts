/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Scene is what `resolveChart` returns and the only thing a renderer reads.
// Colors, text, series, legend order and draw order are decided here. An
// engine chooses ticks, domains, stacking and point density from the intent
// each axis and series states, and formats only through `formatAxisValue`.

import type { ChartGlyph } from '../glyphs';
import type { Cell, ColumnRole, ColumnType } from '../schema/data';
import type { ChartEvent, SelectTarget } from '../schema/events';
import type { PortableFormat } from '../schema/format';

/** The chart kinds a Scene describes. A renderer declares which it supports. */
export const SCENE_KINDS = ['metric', 'xy'] as const;

export type SceneKind = (typeof SCENE_KINDS)[number];

export type ColorScheme = 'light' | 'dark';

/** A concrete color for the Scene's scheme: `#rrggbb` or `#rrggbbaa`. */
export type SceneColor = string;

/**
 * The cells of the node's `data` a mark represents: row indexes into
 * `data.rows` and column ids. A renderer maps a gesture to an event through
 * this, never through its own indexes. Helper marks (reference lines,
 * annotations, progress bars, trend lines) carry none.
 */
export interface SceneSource {
  readonly rows: readonly number[];
  readonly columns: readonly string[];
}

/**
 * What selecting a part of the chart raises, decided by the resolver: the
 * `select` event without the node id and `negate`. `columns` are the dimension
 * columns that identify the target, and `values` their raw cells, which every
 * row in `rows` shares. Present only where the node offers `target`.
 */
interface SceneSelectionBase {
  readonly rows: readonly number[];
  readonly columns: readonly string[];
  readonly values: Readonly<Record<string, Cell>>;
  readonly description: string;
}

export type SceneSelection =
  | (SceneSelectionBase & {
      readonly target: 'datum';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: 'series';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: 'legend';
      readonly series: { readonly layer: number; readonly y: number };
      readonly seriesKey: string;
    })
  | (SceneSelectionBase & {
      readonly target: Exclude<SelectTarget, 'datum' | 'series' | 'legend'>;
    });

/** One labelled value in a tooltip, already formatted. */
export interface SceneTooltipEntry {
  readonly label: string;
  readonly value: string;
  readonly color?: SceneColor;
}

export interface SceneTooltip {
  readonly header?: string;
  readonly entries: readonly SceneTooltipEntry[];
}

/** Chrome colors for the Scene's scheme, resolved from `{ token }` colors and the chart theme. */
export interface SceneChrome {
  readonly text: SceneColor;
  readonly textSubdued: SceneColor;
  readonly axis: SceneColor;
  readonly gridLine: SceneColor;
  readonly background: SceneColor;
  readonly border: SceneColor;
}

export interface SceneColumn {
  readonly id: string;
  readonly label: string;
  readonly type: ColumnType;
  readonly role: ColumnRole;
  /** Every cell is null or empty. A renderer may hide the column. */
  readonly empty: boolean;
}

/**
 * The node's data as text, for accessible tables and the text, Markdown and
 * Slack surfaces. Cells are formatted; an empty cell carries the empty-value
 * text. Rows keep `data` order.
 */
export interface SceneTable {
  readonly columns: readonly SceneColumn[];
  readonly rows: readonly {
    /** The row's index in `data.rows`. */
    readonly row: number;
    readonly cells: readonly string[];
    /** Raw node data in matching column order, for constructing chart events without parsing display text. */
    readonly values: readonly Cell[];
  }[];
}

export interface SceneSize {
  readonly width: number;
  readonly height: number;
}

/** What the node offers, resolved. A renderer offers nothing when the host passes no `onEvent`. */
export interface SceneInteractions {
  /** Empty when nothing is selectable. */
  readonly select: readonly SelectTarget[];
  /** The continuous column a range can be brushed along. */
  readonly brush?: { readonly column: string };
  readonly sync: { readonly cursor: boolean; readonly tooltips: boolean };
  /** Drawn on every surface, including images and text. */
  readonly link?: { readonly href: string; readonly label: string };
  /** Static highlights, by row. */
  readonly emphasis: readonly {
    readonly rows: readonly number[];
    readonly note?: string;
  }[];
}

interface SceneBase {
  readonly kind: SceneKind;
  /** The scheme every color in the Scene is for. Always explicit: native targets have no CSS. */
  readonly scheme: ColorScheme;
  /** The size the host draws the Scene at. Absent when resolved without one. */
  readonly size?: SceneSize;
  readonly locale: string;
  readonly timeZone: string;
  readonly title?: string;
  readonly description?: string;
  readonly chrome: SceneChrome;
  /** One sentence that states what the chart shows, for screen readers and text surfaces. */
  readonly summary: string;
  readonly table: SceneTable;
  readonly interactions: SceneInteractions;
}

export type MetricAlignment = 'left' | 'center' | 'right';

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

export interface MetricScene extends SceneBase {
  readonly kind: 'metric';
  readonly layout: MetricLayout;
  /** In `data` order. */
  readonly tiles: readonly MetricTile[];
}

export type AxisId = 'x' | 'y' | 'y2';

/** Where a continuous axis's domain comes from. An engine computes it. */
export type SceneDomain =
  | {
      readonly kind: 'data';
      /** Extend the domain to include zero. */
      readonly includeZero: boolean;
      /** Round the domain out to readable values. */
      readonly rounding: boolean;
    }
  | { readonly kind: 'custom'; readonly min: number; readonly max: number };

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
  readonly title?: string;
  readonly showTicks: boolean;
  readonly showGrid: boolean;
  /** Tick label rotation in degrees. */
  readonly labelRotation: 0 | -45 | -90;
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
  /** The mark falls in a partial bucket at an edge of the queried range. */
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

export type XySceneLayer =
  | { readonly kind: 'series'; readonly series: XySeries }
  | { readonly kind: 'referenceLine'; readonly line: SceneReferenceLine }
  | { readonly kind: 'annotation'; readonly annotation: SceneAnnotation };

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
}

export type Scene = MetricScene | XyScene;

export type SceneEnvironment = 'browser' | 'node' | 'native';

/** What a renderer is told about where it draws, beside the Scene itself. */
export interface SceneRenderEnv {
  readonly environment: SceneEnvironment;
  /** The node's `id`, which events name. A renderer raises no event for a node without one. */
  readonly nodeId?: string;
  /** Receives every raised event. Absent means the chart offers no interaction. */
  readonly onEvent?: (event: ChartEvent) => void;
}

/**
 * Describes a renderer for a Scene. This interface does not provide renderer
 * selection or a fallback. `TOutput` is what the renderer produces, such as a
 * React node.
 */
export interface SceneRenderer<TOutput = unknown> {
  /** Such as `elastic-charts`, `elastic-charts-node`, `isomer-svg` or `echarts`. */
  readonly id: string;
  readonly environments: readonly SceneEnvironment[];
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
