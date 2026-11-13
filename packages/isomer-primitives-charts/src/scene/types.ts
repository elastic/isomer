/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The Scene is what `resolveChart` returns and the only thing a renderer reads.
// Colors, text, series, legend order and draw order are decided here, and so
// are a time axis's ticks. An engine chooses other ticks, domains, stacking and
// point density from the intent each axis and series states, and formats only
// through `formatAxisValue`.

import type { ChartGlyph } from '../glyphs';
import type { Cell, ColumnRole, ColumnType } from '../schema/data';
import type { ChartEvent, SelectTarget } from '../schema/events';
import type { PortableFormat } from '../schema/format';

/** The chart kinds a Scene describes. A renderer declares which it supports. */
export const SCENE_KINDS = [
  'metric',
  'xy',
  'table',
  'partition',
  'heatmap',
  'gauge',
  'tagCloud',
  'legacyMetric',
] as const;

/** One of {@link SCENE_KINDS}. */
export type SceneKind = (typeof SCENE_KINDS)[number];

/** The color scheme a Scene is resolved for. */
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

interface SceneSelectionBase {
  readonly rows: readonly number[];
  readonly columns: readonly string[];
  readonly values: Readonly<Record<string, Cell>>;
  readonly description: string;
}

/**
 * What selecting a part of the chart raises, decided by the resolver: the
 * `select` event without the node id and `negate`. `columns` are the dimension
 * columns that identify the target, and `values` their raw cells, which every
 * row in `rows` shares. Present only where the node offers `target`.
 */
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

/** A tooltip's header and entries, already formatted. */
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

/** One column of {@link SceneTable}, labelled for display. */
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
  /** A summary row below the rows, one string per column, where the chart has one. */
  readonly footer?: readonly string[];
}

/** A box in CSS pixels. */
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
  /** The scheme every color in the Scene is for. Always explicit, so a renderer draws every color without CSS. */
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
}

/** An xy Scene's axis: the category axis, or the primary or secondary value axis. */
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

/** One axis of an xy Scene, stated as intent: the engine chooses its ticks from `format` and `domain`, except a time axis's `timeTicks`. */
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
  /** Tick label rotation in degrees; 0 on an axis with `timeTicks`. */
  readonly labelRotation: 0 | -45 | -90;
  /**
   * On a vertical chart's time x axis, the two-row axis Lens draws: the ticks
   * and labels at every plot width. A renderer draws these rather than
   * choosing ticks.
   */
  readonly timeTicks?: SceneTimeTicks;
}

/** One tick of a {@link SceneTimeLayer}. */
export interface SceneTimeTick {
  /** Where the tick's interval starts, in epoch milliseconds. One before the domain draws at the domain's start. */
  readonly at: number;
  /** Empty on an unlabeled layer. */
  readonly label: string;
}

/** One raster of a time axis: ticks at one interval, such as every hour or every day. */
export interface SceneTimeLayer {
  /**
   * The label row: 0 holds the minor labels, beside the plot, such as `14:00`;
   * 1 the major labels below them, such as `November 3, 2026`. -1 is an
   * unlabeled raster finer than both.
   */
  readonly row: -1 | 0 | 1;
  readonly labeled: boolean;
  /** Draws a grid line at each tick, where the axis shows a grid. */
  readonly grid: boolean;
  /** In time order. */
  readonly ticks: readonly SceneTimeTick[];
}

/** What a time axis draws from one plot width up to the next band's `from`. */
export interface SceneTimeBand {
  /** The narrowest plot width, in CSS pixels, the band is drawn at. */
  readonly from: number;
  /** Finest first. */
  readonly layers: readonly SceneTimeLayer[];
}

/**
 * A time axis's ticks for every plot width, as Elastic Charts' multi-layer time
 * axis picks them from the domain, bucket, time zone and locale. A renderer
 * draws the band for its plot width (`timeTicksAt`).
 */
export interface SceneTimeTicks {
  /** In epoch milliseconds; `max` runs one bucket past the last x where bars fill buckets. */
  readonly domain: { readonly min: number; readonly max: number };
  /** The bucket width, in milliseconds. */
  readonly interval: number;
  /** By ascending `from`; the first is from 0. */
  readonly bands: readonly SceneTimeBand[];
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
}

/** How a table column aligns its cells. */
export type TableAlignment = 'left' | 'center' | 'right';

/** One column of a {@link TableScene}, with its alignment, width and footer. */
export interface TableColumn extends SceneColumn {
  readonly alignment: TableAlignment;
  /** Width in pixels, where the node sets one. */
  readonly width?: number;
  /** The `summary` footer, formatted, such as "Sum: 1,204". */
  readonly footer?: string;
}

/** How one cell is drawn. Colors are concrete for the Scene's scheme. */
export interface TableCell {
  /** The cell's row and column. */
  readonly source: SceneSource;
  /** As Kibana's table shows it: `-` for a missing value, `(blank)` for an empty string. */
  readonly text: string;
  /** Why a cell is empty. Empty cells are drawn subdued and never decorated. */
  readonly empty?: 'missing' | 'blank';
  /** What an empty cell's text stands for, such as `(null)`, for a tooltip or a screen reader. */
  readonly title?: string;
  readonly color: SceneColor;
  /** The whole cell's fill. */
  readonly background?: SceneColor;
  /** A badge around the text: its fill. `color` is the text on it. */
  readonly badge?: SceneColor;
  /**
   * A bar beside the text, as fractions of the bar's track: the fill runs from
   * `from` to `to`, `0 ≤ from ≤ to ≤ 1`.
   */
  readonly bar?: {
    readonly from: number;
    readonly to: number;
    readonly color: SceneColor;
    readonly track: SceneColor;
  };
  readonly description: string;
  /** The `cell` selection, on `dimension` cells when the node offers it. */
  readonly selection?: SceneSelection;
}

/** One row of a {@link TableScene}: its cells, in column order. */
export interface TableRow {
  /** The row's index in `data.rows`. */
  readonly row: number;
  /** One per column in `columns`, in that order. */
  readonly cells: readonly TableCell[];
  /** Emphasized: the note, or an empty string for none. */
  readonly emphasis?: string;
}

/** Positions into `rows`, in the order a sort shows them. */
export interface TableOrder {
  readonly asc: readonly number[];
  readonly desc: readonly number[];
}

/** A Scene of a data table: columns, rows and their sorted orders. */
export interface TableScene extends SceneBase {
  readonly kind: 'table';
  /** The columns shown, in order. */
  readonly columns: readonly TableColumn[];
  /** The column whose cells head their rows: the first `dimension` shown. */
  readonly rowHeader?: string;
  /** In `data` order. */
  readonly rows: readonly TableRow[];
  /** The sort the table starts in. */
  readonly sort?: {
    readonly column: string;
    readonly direction: 'asc' | 'desc';
  };
  /** Positions into `rows` in the order they show at first: `sort`'s, else `data` order. */
  readonly order: readonly number[];
  /** Each column's sorted orders, by column id, so a renderer can re-sort without comparing values. */
  readonly orders: Readonly<Record<string, TableOrder>>;
  /** Present when rows are paged. */
  readonly paging?: {
    readonly pageSize: number;
    readonly pageCount: number;
    /** Such as "Rows per page: 10". */
    readonly rowsPerPage: string;
    /** One label per page, first page first. */
    readonly pageLabels: readonly string[];
  };
  readonly density: 'compact' | 'default' | 'expanded';
  /** Drawn in place of the rows when there are none. */
  readonly emptyText: string;
  /** Header and footer fill. */
  readonly headerBackground: SceneColor;
  /** The fill of an emphasized row. */
  readonly emphasisBackground: SceneColor;
}

/** The shapes a {@link PartitionScene} draws. */
export type PartitionSceneShape =
  'pie' | 'donut' | 'treemap' | 'mosaic' | 'waffle';

/** One slice of a {@link PartitionScene}, with its children in draw order. */
export interface PartitionNode {
  /**
   * Unique in the Scene: the key parts of the slice's path, outermost first,
   * joined by `:`. A metric slice's part is its column id.
   */
  readonly key: string;
  /** The slice's name: its group cell as displayed, or its metric's label. */
  readonly label: string;
  /** 1 for the outermost layer. */
  readonly depth: number;
  /** The metric column a slice of the metric layer stands for. */
  readonly metric?: string;
  /** The sum of its leaves' values, in the order an engine sums them: depth first, in draw order. */
  readonly value: number;
  /** `value` as displayed. */
  readonly valueText: string;
  /** `value`'s share of the whole, from 0 to 1. */
  readonly share: number;
  /** `share` as a percentage, such as "40.25%". */
  readonly percentText: string;
  /** What follows the name on the slice: `valueText`, `percentText` or empty, as the node's `labels.values` says. */
  readonly valueLabel: string;
  /** The fill. Transparent (`#FFFFFF00`) on a mosaic's outer layer, which its inner slices cover. */
  readonly color: SceneColor;
  /** The slice's rows and columns: its group columns and its metrics. */
  readonly source: SceneSource;
  /** The slice and each slice it sits in, outermost first, for a tooltip. */
  readonly tooltip: SceneTooltip;
  /** What a selection of the slice describes, such as "host.name: web-01". */
  readonly description: string;
  /** The `slice` selection, when the node offers it. */
  readonly selection?: SceneSelection;
  /** In draw order; empty on the innermost layer. */
  readonly children: readonly PartitionNode[];
}

/** One layer of a {@link PartitionScene}, outermost first. */
export interface PartitionLayer {
  /** The group column, absent on the metric layer. */
  readonly column?: string;
  readonly label: string;
}

/** One legend entry of a {@link PartitionScene}, in legend order. */
export interface PartitionLegendItem {
  /** The {@link PartitionNode.key} it names. */
  readonly key: string;
  readonly label: string;
  readonly color: SceneColor;
  /** 1 for the outermost layer. */
  readonly depth: number;
  /** The slice's value, when the legend shows values. */
  readonly value?: string;
  readonly description: string;
  /** The `slice` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A partition Scene's legend: placement, sizing and items. */
export interface PartitionLegend {
  readonly visible: boolean;
  readonly position: 'top' | 'bottom' | 'left' | 'right';
  /** Every layer, each slice after its parent, rather than the outermost alone. */
  readonly nested: boolean;
  readonly maxLines: number;
  readonly size: 'auto' | 's' | 'm' | 'l' | 'xl';
  readonly values: boolean;
  /** Flat: the outermost slices in the order their rows first show them. Nested: every slice, depth first in draw order. */
  readonly items: readonly PartitionLegendItem[];
}

/** A Scene of slices of a whole: pie, donut, treemap, mosaic or waffle. */
export interface PartitionScene extends SceneBase {
  readonly kind: 'partition';
  readonly shape: PartitionSceneShape;
  /** Outermost first. */
  readonly layers: readonly PartitionLayer[];
  /** The outermost slices, in draw order, each with its children. */
  readonly nodes: readonly PartitionNode[];
  readonly total: number;
  readonly labels: {
    /** Where slice names draw; `auto` lets a pie or donut draw a name outside, linked to its slice. */
    readonly categories: 'auto' | 'inside' | 'hidden';
    readonly values: 'percent' | 'value' | 'hidden';
  };
  /** The hole's radius as a share of the chart's; 0 for any shape but a donut. */
  readonly donutHole: number;
  readonly legend: PartitionLegend;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: {
    readonly reason: 'noResults' | 'negative';
    readonly text: string;
  };
}

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

/** One word of a {@link TagCloudScene}: a row. */
export interface TagCloudWord {
  /** The `tags` cell as displayed. */
  readonly text: string;
  /** Its place from the smallest value (0) to the largest (1), which sizes it along the Scene's `scale`. */
  readonly weight: number;
  readonly value: number | null;
  /** `value` as displayed. */
  readonly valueText: string;
  readonly color: SceneColor;
  readonly source: SceneSource;
  /** What a selection of the word describes, such as "host.name: web-01 · Count: 12". */
  readonly description: string;
  /** The `tag` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A Scene of words sized by value. */
export interface TagCloudScene extends SceneBase {
  readonly kind: 'tagCloud';
  /** In row order. */
  readonly words: readonly TagCloudWord[];
  /** How a word's `weight` becomes its font size between `fontSize.min` and `fontSize.max`. */
  readonly scale: 'linear' | 'log' | 'squareRoot';
  /**
   * The angles words may take, in degrees: `count` evenly spaced from `start`
   * to `end`, each word's chosen from its text, as Elastic Charts' word cloud
   * chooses it.
   */
  readonly angles: {
    readonly start: number;
    readonly end: number;
    readonly count: number;
  };
  readonly fontSize: { readonly min: number; readonly max: number };
  /** Written under the cloud, when the node shows it. */
  readonly label?: string;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}

/** One tile of a {@link LegacyMetricScene}: one value of one row, its type sized to fit the chart. */
export interface LegacyMetricTile {
  /** The tile's row, and its breakdown and value columns. */
  readonly source: SceneSource;
  readonly label: string;
  readonly value: {
    readonly text: string;
    readonly raw: Cell;
    readonly color: SceneColor;
  };
  readonly labelColor: SceneColor;
  /** The tile's own background, when it does not fill the chart: its band's color, else the emphasis fill when emphasized. */
  readonly background?: SceneColor;
  /**
   * Lengths in pixels, already shrunk to fit the Scene's `size` as Lens's
   * auto scale shrinks them: the value's and label's font sizes, and the
   * padding around them.
   */
  readonly type: {
    readonly value: number;
    readonly label: number;
    readonly padding: number;
  };
  /** The tile's box at those lengths, from estimated text widths: the width it draws at. */
  readonly box: SceneSize;
  /** What a selection of the tile describes, such as "host.name: web-01 · Count: 12". */
  readonly description: string;
  /** Emphasized: the note, or an empty string for none. */
  readonly emphasis?: string;
  /** The `tile` selection, when the node offers it. */
  readonly selection?: SceneSelection;
}

/** A Scene of large values with labels, as Lens's legacy metric draws them. */
export interface LegacyMetricScene extends SceneBase {
  readonly kind: 'legacyMetric';
  /** In tile order: every row of the first metric column, then of the next. */
  readonly tiles: readonly LegacyMetricTile[];
  readonly labelPosition: 'top' | 'bottom';
  /** How a tile's value and label align with each other. */
  readonly textAlign: MetricAlignment;
  readonly showLabels: boolean;
  /** Line height as a multiple of the font size. */
  readonly lineHeight: number;
  readonly valueWeight: number;
  /** The whole chart's background: a lone tile's band color, else the chrome background. */
  readonly background: SceneColor;
  /** Present when there is nothing to draw: the reason, and the text to draw instead. */
  readonly empty?: { readonly reason: 'noResults'; readonly text: string };
}

/** What a renderer draws: a {@link MetricScene}, an {@link XyScene}, a {@link TableScene}, a {@link PartitionScene}, a {@link HeatmapScene}, a {@link GaugeScene}, a {@link TagCloudScene} or a {@link LegacyMetricScene}. */
export type Scene =
  | MetricScene
  | XyScene
  | TableScene
  | PartitionScene
  | HeatmapScene
  | GaugeScene
  | TagCloudScene
  | LegacyMetricScene;

/** Where a renderer draws: a browser DOM, or Node with no DOM. */
export type SceneEnvironment = 'browser' | 'node';

/** What a renderer is told about where it draws, beside the Scene itself. */
export interface SceneRenderEnv {
  readonly environment: SceneEnvironment;
  /** The node's `id`, which events name. A renderer raises no event for a node without one. */
  readonly nodeId?: string;
  /** Receives every raised event. Absent means the chart offers no interaction. */
  readonly onEvent?: (event: ChartEvent) => void;
  /** Resolves the pack's own style handles to class names, for a renderer that draws with the pack's styles. */
  readonly resolveClassName?: (
    ...handles: { readonly key: string; readonly readableName: string }[]
  ) => string;
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
  /**
   * True when the renderer draws a fixed-size picture at the Scene's `size`,
   * such as an SVG, so a Scene drawn by it always carries one.
   */
  readonly sized?: boolean;
  /** True when the renderer fills its container, so in a browser the container takes the chart's size spec. */
  readonly fluid?: boolean;
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
