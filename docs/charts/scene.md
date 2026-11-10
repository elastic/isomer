---
navigation_title: Scene
description: The Scene a chart node resolves to, and the SceneRenderer interface every chart engine implements.
---

# Scene

A chart node resolves to a **Scene**: what every surface must agree on, decided once. Colors are concrete for one scheme, every string the Scene holds is formatted, legend items and series are in order, and marks are in data space. Axes and series state intent (a scale, a format, where a domain comes from, a stack mode, point visibility), and the chart engine computes ticks, domains, stacks and point density from it, as Elastic Charts does for Lens. A time axis on a vertical chart is the exception: the Scene holds its ticks and labels, the [two-row time axis](#time-axes) Lens draws. Other tick labels are the one string the Scene does not hold: the engine formats each tick it chooses from its axis's format through `formatAxisValue`. Text, colors, order and time-axis ticks are identical in every engine; other tick placement may differ.

```ts
import type {
  Scene,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';
```

## What every Scene holds

| Field                        | What it is                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                       | `metric`, `xy`, `table` or `partition`                                                                                                                                       |
| `scheme`                     | `light` or `dark`. Always explicit: native targets have no CSS, so `light-dark()` is never the only source of a color                                                        |
| `size`, `locale`, `timeZone` | What the Scene was resolved for                                                                                                                                              |
| `chrome`                     | Text, axis, grid-line, background and border colors                                                                                                                          |
| `summary`                    | One sentence on what the chart shows                                                                                                                                         |
| `table`                      | The node's data in `data` order. Formatted `cells` serve text surfaces; raw `values` are in matching column order so renderers can raise events without parsing display text |
| `interactions`               | What the node offers, resolved: selection targets, brush column, sync, link and emphasis                                                                                     |

A `MetricScene` has a `layout` and one tile per row. A `PartitionScene` has its `layers`, its slices as a tree in draw order (`nodes`), the `total`, its `labels`, `donutHole` and `legend`, and `empty` when there is nothing to draw ([how a partition chart resolves](partition-chart.md#how-it-resolves)). An `XyScene` has `axes` (scale, format and domain intent), `categories` (every x position with data), `layers` in exact draw order, and a `legend`. Each layer is a resolved series, reference line or annotation; helper marks are interleaved with series in the order they appear in the chart.

## `resolveChart`

```ts
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';

const scene = resolveChart(node, {
  scheme: 'dark',
  size: { width: 480, height: 240 },
});
```

`resolveChart(node, { scheme, size?, locale?, timeZone? })` turns a `metric`, `xyChart`, `dataTable` or `partitionChart` node into its Scene ([how a table resolves](data-table.md#how-it-resolves)). It is pure and synchronous, and the Scene is plain JSON data, so it can be resolved on a server and shipped; only the ticks an engine chooses are formatted where it runs, through `formatAxisValue`. `locale` defaults to `en` and `timeZone`, for dates whose format names none, to `UTC`. Every string comes from the node: its `display` strings, or its values in their [formats](format.md). No host code takes part, so a node prints the same wherever it is resolved; a host that needs its own text sends `display` strings.

What it decides:

- **Colors** from the node, concrete for the scheme. Chrome and the default categorical palette come from one theme, EUI Borealis tokens. Text, trend strokes and progress fills on a colored metric background use whichever scheme's text color contrasts more after compositing over the chart background.
- **Metric tiles**, one per row: titles from the breakdown, colors by band (a percentage band reads each tile's place from 0 to its own `max`, across the range of tiles, or from 0 to twice a lone value, and a tile in an empty range takes the first band), comparisons (to the primary: the primary minus the secondary, signed; to a baseline: the value, colored by the sign of the secondary minus the baseline), and three tiles per row unless `maxColumns` says otherwise.
- **Xy series** in layer, y-column and first-appearance order of split values, each with its stack group and mode; marks carry unstacked values, their `label` (the value as displayed, for a bar label or a tooltip the engine builds) and their `description` (each dimension and the value, for selections and screen readers). Categories list every x position any series has data at, in axis order, ordinal ones in row order; a series' `source` holds the rows that drew its marks. A mark is `partial` when its bucket crosses an edge of `style.partialBuckets`; the bucket is `axes.x.interval` wide, or its layer's smallest x spacing when the node states none.
- **Axes** as intent: the scale; the format values print in (a percentage stack's axis prints percent); on a time axis, the zone ticks fall on round times in (the x format's `timeZone`, or the Scene's); and the domain, either `custom` bounds or `data` with whether it includes zero (bars and areas on a `full` y axis, and percentage stacks, except on a log axis) and whether it rounds. An ordinal axis has no domain: its positions are `categories` in order. A continuous x axis carries the node's `interval`, when it states one, for an engine to size bars by. A vertical chart's time x axis carries `timeTicks`, its [two-row time axis](#time-axes). On every other axis the engine chooses ticks and labels each with `formatAxisValue(scene, axis, value)`, the only formatting a renderer does.
- **Multivalue coordinates** in a `metric` use the first non-null element for values, trend coordinates and bar maxima. Empty arrays are missing. An `xyChart` has none: its x, y and split columns are single-valued. Labels, tables and selection values retain the whole cell.
- **Selections** for each target the node offers, and none it does not.

Legend statistic names, default reference-line and annotation colors, and style defaults such as area opacity and bar minimum height are Isomer's choices for nodes that do not state them. A materializer states its source's own values; the parity gates compare the result with Elastic Charts and refine them.

The series in `interactions.initial.hiddenSeries` start hidden: their legend items say so, and the summary sentence, which no reader can toggle, leaves them out. Everything else in the Scene holds every series, so an engine shows or hides one without resolving again.

Every data layer shares one x column, so one axis scale and format serve them all. A node that skipped validation and holds an x cell its continuous scale cannot place throws a `RangeError`.

Ordinal x positions are opaque keys derived from raw cells; tick and category labels hold their displayed text. Distinct cells remain distinct positions even when their labels match; a date cell is its instant, so date-times for one instant share a position, as they share a split series, whatever their UTC offset.

## Time axes

A time x axis on a vertical chart carries `timeTicks`: the axis Lens draws, with minor labels beside the plot (`14:00`, `3rd`, `Nov`) and major labels below them (`November 3, 2026`, `November 2026`, `2026`) wherever a coarser unit starts. It is Elastic Charts' multi-layer time axis (`timeAxisLayerCount: 2`, its default and Lens's), decided by the resolver from the same inputs and rules: the rasters from milliseconds to decades, the finest whose ticks keep each raster's minimum spacing (24 pixels times a factor per raster) and number no more than 50, never finer than the bucket, and labels from `Intl.DateTimeFormat` in the Scene's `locale` and the axis's `timeZone`. Day, week, month and year starts are wall-clock times in that zone, so a day across a daylight saving change is 23 or 25 hours and an hour the clock repeats is labeled twice. Weeks start on Monday, as Elastic Charts' default `dow` does. The labels are Elastic Charts', not the x column's format: a column that prints full dates still labels its axis `14:00` over `November 3, 2026`.

Which ticks fit depends on the plot's width, which only the engine knows once it lays out the axes and legend. So `timeTicks` holds every width's ticks:

| Field | What it is |
| --- | --- |
| `domain` | `min` and `max` in epoch milliseconds: the drawn marks' extent, or the custom domain, with `max` one bucket further where bars fill buckets (any stacked bars, or one bar series) |
| `interval` | The bucket in milliseconds: the axis's `interval`, unless it is wider than the marks' smallest spacing, which is used then, as it is when the node states none |
| `bands` | By ascending `from`, the first from 0: each holds the `layers` drawn at plot widths from its `from`, in CSS pixels, up to the next band's. Bands wider than the Scene's `size` are left out |

A layer is one raster, finest first: its label `row` (0 beside the plot, 1 below it, -1 for unlabeled ticks finer than both), whether it is `labeled`, whether it draws `grid` lines where the axis shows a grid, and its `ticks`, each an `at` time and a `label` (empty on an unlabeled layer). A row's first tick may start before the domain: on row 0 the resolver leaves it out, and on row 1 it draws at the domain's start, so the first day or month is always named.

A renderer measures its plot width, takes that band with `timeTicksAt(timeTicks, width)` and draws every layer's ticks at `max(at, domain.min)` along `domain`. Two rules depend on measuring text, so the renderer applies them, as Elastic Charts does: it leaves out a layer's first tick when its label would reach the next tick (its width plus a 4-pixel gap), and drops the label, not the tick, of the axis's last tick when the label would run past the plot. A horizontal chart's time axis, and any time axis without `timeTicks`, labels the ticks the engine chooses through `formatAxisValue`.

## Marks carry their rows and columns

Every selectable part of a Scene (a metric tile, an xy mark, a series, a legend item) carries a `source`: the row indexes into `data.rows` and the column ids it represents, built in the same pass as the mark. The table keeps each row's raw `values` alongside its formatted `cells`. A renderer maps a gesture to an event through `source` and those raw values, never through its own indexes or parsed display text, so alignment, helper series and duplicate labels cannot send a click to the wrong row.

Each `XySeries` carries its `series` reference: the index of its data layer and y entry, uniquely identifying the series even when different layers share the same series key.

Helper marks carry no `source` and are never selected: progress bars, trend lines, reference lines, annotations and the current-time marker.

## Selections and events

Where the node offers a selection target, the part a reader selects carries a `selection`: the event it raises, decided by the resolver.

```ts
type SceneSelection = {
  rows: number[]; // indexes into `data.rows`
  columns: string[]; // the dimension columns that identify the target
  values: Record<string, Cell>; // their raw cells, which every row in `rows` shares
  description: string;
} & (
  | {
      target: 'datum' | 'series' | 'legend';
      series: { layer: number; y: number };
      seriesKey: string;
    }
  | { target: 'category' | 'cell' | 'tile' | 'slice' }
);
```

| Target     | Carried by                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tile`     | Each metric tile                                                                                                              |
| `slice`    | Each partition slice and legend item                                                                                          |
| `cell`     | Each `dimension` cell of a table                                                                                              |
| `datum`    | Each xy mark                                                                                                                  |
| `series`   | Each xy series                                                                                                                |
| `legend`   | Each legend item                                                                                                              |
| `category` | Each entry of an `XyScene`'s `categories`: every x position with data, in axis order, with its label as the x axis formats it |

`datum`, `series` and `legend` selections also carry the data layer and y-entry reference (`series`) and the encoded `seriesKey` required by `ChartEvent`.

A renderer raises events with two helpers, so every renderer raises the same event for the same gesture:

- `selectEvent(nodeId, selection, negate?)` returns the `chart.select` event for a selection.
- `brushEvent(scene, nodeId, [from, to])` returns the `chart.brush` event for a range along the brush column, or `undefined` when the node offers no brush. Its description names each end by the nearest x position in `categories`; on an ordinal axis, whose positions are not numbers, it names only the column.

## `SceneRenderer`

```ts
interface SceneRenderer<TOutput = unknown> {
  id: string; // 'elastic-charts', 'isomer-svg', 'echarts', …
  environments: Array<'browser' | 'node' | 'native'>;
  sized?: boolean; // draws a fixed-size picture at the Scene's size
  fluid?: boolean; // fills its container
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
```

This interface describes a renderer. `TOutput` is what the renderer produces, such as a React node. `selectSceneRenderer(preferences, kind, environment)` picks the first renderer in a preference list that runs in the current environment and supports the Scene's kind; [Rendering](rendering.md) covers where the pack takes the list from and its fallback.
A `sized` renderer, such as one that draws an SVG, always gets a Scene with a `size`; in a browser, a `fluid` renderer fills a box shaped by the chart's size spec ([Chart size](rendering.md#chart-size)). A renderer that is neither sizes itself, as the summary fallback does.
`SceneRenderEnv` carries the `environment`, the node's `id`, and the host's `onEvent`, which receives each [`ChartEvent`](interactions.md#chartevent). Without `onEvent` a renderer offers no interaction. It also carries the render's `resolveClassName`, through which a renderer drawing with the pack's own styles, such as its table, resolves its classes.

`metricSingleValueScene`, `xyTimeSeriesScene` and `xyInteractiveScene` are hand-written Scenes for three schema examples, for building and testing a renderer without the resolver. `xyInteractiveScene`'s selections raise exactly the events in `chartEventExamples`.
