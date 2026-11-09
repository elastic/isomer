---
navigation_title: Scene
description: The Scene a chart node resolves to, and the SceneRenderer interface every chart engine implements.
---

# Scene

A chart node resolves to a **Scene**: what every surface must agree on, decided once. Colors are concrete for one scheme, every string the Scene holds is formatted, legend items and series are in order, and marks are in data space. Axes and series state intent (a scale, a format, where a domain comes from, a stack mode, point visibility), and the chart engine computes ticks, domains, stacks and point density from it, as Elastic Charts does for Lens. Tick labels are the one string the Scene does not hold: the engine formats each tick it chooses from its axis's format through `formatAxisValue`. Text, colors and order are identical in every engine; tick placement may differ.

```ts
import type {
  Scene,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';
```

## What every Scene holds

| Field                        | What it is                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                       | `metric`, `xy` or `table`                                                                                                                                                    |
| `scheme`                     | `light` or `dark`. Always explicit, so a renderer draws every color without CSS: `light-dark()` is never the only source of a color                                          |
| `size`, `locale`, `timeZone` | What the Scene was resolved for                                                                                                                                              |
| `chrome`                     | Text, axis, grid-line, background and border colors                                                                                                                          |
| `summary`                    | One sentence on what the chart shows                                                                                                                                         |
| `table`                      | The node's data in `data` order. Formatted `cells` serve text surfaces; raw `values` are in matching column order so renderers can raise events without parsing display text |
| `interactions`               | What the node offers, resolved: selection targets, brush column, sync, link and emphasis                                                                                     |

A `MetricScene` has a `layout` and one tile per row. An `XyScene` has `axes` (scale, format and domain intent), `categories` (every x position with data), `layers` in exact draw order, and a `legend`. Each layer is a resolved series, reference line or annotation; helper marks are interleaved with series in the order they appear in the chart.

## `resolveChart`

```ts
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';

const scene = resolveChart(node, {
  scheme: 'dark',
  size: { width: 480, height: 240 },
});
```

`resolveChart(node, { scheme, size?, locale?, timeZone? })` turns a `metric`, `xyChart` or `dataTable` node into its Scene ([how a table resolves](data-table.md#how-it-resolves)). It is pure and synchronous, and the Scene is plain JSON data, so it can be resolved on a server and shipped; only tick labels are formatted where the engine runs, through `formatAxisValue`. `locale` defaults to `en` and `timeZone`, for dates whose format names none, to `UTC`. Every string comes from the node: its `display` strings, or its values in their [formats](format.md). No host code takes part, so a node prints the same wherever it is resolved; a host that needs its own text sends `display` strings.

What it decides:

- **Colors** from the node, concrete for the scheme. Chrome and the default categorical palette come from one theme, EUI Borealis tokens. Text, trend strokes and progress fills on a colored metric background use whichever scheme's text color contrasts more after compositing over the chart background.
- **Metric tiles**, one per row: titles from the breakdown, colors by band (a percentage band reads each tile's place from 0 to its own `max`, across the range of tiles, or from 0 to twice a lone value, and a tile in an empty range takes the first band), comparisons (to the primary: the primary minus the secondary, signed; to a baseline: the value, colored by the sign of the secondary minus the baseline), and three tiles per row unless `maxColumns` says otherwise.
- **Xy series** in layer, y-column and first-appearance order of split values, each with its stack group and mode; marks carry unstacked values, their `label` (the value as displayed, for a bar label or a tooltip the engine builds) and their `description` (each dimension and the value, for selections and screen readers). Categories list every x position any series has data at, in axis order, ordinal ones in row order; a series' `source` holds the rows that drew its marks. A mark is `partial` when its bucket crosses an edge of `style.partialBuckets`; the bucket is `axes.x.interval` wide, or its layer's smallest x spacing when the node states none.
- **Axes** as intent: the scale; the format values print in (a percentage stack's axis prints percent); on a time axis, the zone ticks fall on round times in (the x format's `timeZone`, or the Scene's); and the domain, either `custom` bounds or `data` with whether it includes zero (bars and areas on a `full` y axis, and percentage stacks, except on a log axis) and whether it rounds. An ordinal axis has no domain: its positions are `categories` in order. A continuous x axis carries the node's `interval`, when it states one, for an engine to size bars by. The engine chooses ticks and labels each with `formatAxisValue(scene, axis, value)`, the only formatting a renderer does.
- **Multivalue coordinates** in a `metric` use the first non-null element for values, trend coordinates and bar maxima. Empty arrays are missing. An `xyChart` has none: its x, y and split columns are single-valued. Labels, tables and selection values retain the whole cell.
- **Selections** for each target the node offers, and none it does not.

Legend statistic names, default reference-line and annotation colors, and style defaults such as area opacity and bar minimum height are Isomer's choices for nodes that do not state them. A materializer states its source's own values; the parity gates compare the result with Elastic Charts and refine them.

The series in `interactions.initial.hiddenSeries` start hidden: their legend items say so, and the summary sentence, which no reader can toggle, leaves them out. Everything else in the Scene holds every series, so an engine shows or hides one without resolving again.

Every data layer shares one x column, so one axis scale and format serve them all. A node that skipped validation and holds an x cell its continuous scale cannot place throws a `RangeError`.

Ordinal x positions are opaque keys derived from raw cells; tick and category labels hold their displayed text. Distinct cells remain distinct positions even when their labels match; a date cell is its instant, so date-times for one instant share a position, as they share a split series, whatever their UTC offset.

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
  | { target: 'category' | 'cell' | 'tile' }
);
```

| Target     | Carried by                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tile`     | Each metric tile                                                                                                              |
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
  environments: Array<'browser' | 'node'>;
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
