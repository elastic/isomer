---
navigation_title: Scene
description: The Scene a chart node resolves to, and the SceneRenderer interface every chart engine implements.
---

# Scene

A chart node resolves to a **Scene**: everything a renderer draws, decided once. Colors are concrete for one scheme, every displayed string is formatted, ticks are chosen for the size, legend items and series are in order, and marks are in data space. Renderers read only the Scene, so text, colors and order are identical in every engine.

```ts
import type {
  Scene,
  SceneRenderer,
} from '@elastic/isomer-primitives-charts/scene';
```

## What every Scene holds

| Field                        | What it is                                                                                                                                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kind`                       | `metric` or `xy`                                                                                                                                                             |
| `scheme`                     | `light` or `dark`. Always explicit: native targets have no CSS, so `light-dark()` is never the only source of a color                                                        |
| `size`, `locale`, `timeZone` | What the Scene was resolved for                                                                                                                                              |
| `chrome`                     | Text, axis, grid-line, background and border colors                                                                                                                          |
| `summary`                    | One sentence on what the chart shows                                                                                                                                         |
| `table`                      | The node's data in `data` order. Formatted `cells` serve text surfaces; raw `values` are in matching column order so renderers can raise events without parsing display text |
| `interactions`               | What the node offers, resolved: selection targets, brush column, sync, link and emphasis                                                                                     |

A `MetricScene` has a `layout` and one tile per row. An `XyScene` has `axes` (domains and ticks with labels), `categories` (every x position with data), `layers` in exact draw order, and a `legend`. Each layer is a resolved series, reference line or annotation; helper marks are interleaved with series in the order they appear in the chart.

## `resolveChart`

```ts
import { resolveChart } from '@elastic/isomer-primitives-charts/scene';

const scene = resolveChart(node, {
  scheme: 'dark',
  size: { width: 480, height: 240 },
});
```

`resolveChart(node, { scheme, size?, locale?, timeZone? })` turns a `metric` or `xyChart` node into its Scene. It is pure and synchronous, and the Scene is plain JSON data, so it can be resolved on a server and shipped. `locale` defaults to `en` and `timeZone`, for dates whose format names none, to `UTC`. Every string comes from the node: its `display` strings, or its values in their [formats](format.md). No host code takes part, so a node prints the same wherever it is resolved; a host that needs its own text sends `display` strings.

What it decides:

- **Colors** from the node, concrete for the scheme. Chrome and the default categorical palette come from one theme, EUI Borealis tokens (`CHART_CHROME`, `CATEGORICAL_PALETTE`). Text, trend strokes and progress fills on a colored metric background use whichever scheme's text color contrasts more after compositing over the chart background.
- **Metric tiles**, one per row: titles from the breakdown, colors by band (a percentage band reads each tile's share of its own `max`, or of the range across tiles), comparisons (to the primary: the signed difference; to a baseline: the value, colored by the difference's sign), and three tiles per row unless `maxColumns` says otherwise.
- **Xy series** in layer, y-column and first-appearance order of split values; stacks (positive and negative values separately, percentages to one); categories in axis order; tooltips listing every visible series at an x. Initially hidden series contribute neither stack offsets nor percentage totals nor y-axis domains.
- **Axes**: a domain including zero for bars and areas unless `fit` or `custom`, rounded out to the tick step; linear ticks at 1, 2 or 5 times a power of ten (one per 50 px on y, 100 px on x, five without a size); time ticks on round wall-clock times in the Scene's time zone, with calendar days, two-day ticks on odd local dates, Sunday weeks, months, quarters and years across daylight-saving changes; ordinal ticks thinned to one per 30 px. A singleton time domain spans its local calendar day, clipped to the supported Date range (±8.64e15 milliseconds). Tick labels use the column's format.
- **Multivalue coordinates** use the first non-null element for numeric values, dates, trend coordinates and bar maxima. Empty arrays are missing. Labels, tables and selection values retain the whole cell.
- **Selections** for each target the node offers, and none it does not.

Tick placement, legend statistic names, default reference-line and annotation colors, and style defaults such as area opacity and bar minimum height are Isomer's choices for nodes that do not state them. A materializer states its source's own values; the parity gates compare the result with Elastic Charts and refine them.

Each data layer reads its own x column; the first supplies the shared axis format. Matching x-column types supply the automatic scale; mixed types fall back to ordinal positions so every layer retains its data. Validation reports an incompatible coordinate on a continuous scale at its `data.rows` cell path. Direct resolution of an unvalidated node still throws a `RangeError`. Category selections are omitted when the contributing rows have incompatible dimension values.

Ordinal x positions are opaque keys derived from raw cells; tick and category labels hold their displayed text. Distinct cells remain distinct positions even when their labels match.

## Marks carry their rows and columns

Every selectable part of a Scene (a metric tile, an xy mark, a series, a legend item) carries a `source`: the row indexes into `data.rows` and the column ids it represents, built in the same pass as the mark. The table keeps each row's raw `values` alongside its formatted `cells`. A renderer maps a gesture to an event through `source` and those raw values, never through its own indexes or parsed display text, so alignment, helper series and duplicate labels cannot send a click to the wrong row.

Each `XySeries` names its x-coordinate column in `xColumn`, absent for row-index positions. It also carries its `series` reference: the index of its data layer and y entry, uniquely identifying the series even when different layers share the same series key.

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
| `datum`    | Each xy mark                                                                                                                  |
| `series`   | Each xy series                                                                                                                |
| `legend`   | Each legend item                                                                                                              |
| `category` | Each entry of an `XyScene`'s `categories`: every x position with data, in axis order, with its label as the x axis formats it |

`datum`, `series` and `legend` selections also carry the data layer and y-entry reference (`series`) and the encoded `seriesKey` required by `ChartEvent`.

A renderer raises events with two helpers, so every renderer raises the same event for the same gesture:

- `selectEvent(nodeId, selection, negate?)` returns the `chart.select` event for a selection.
- `brushEvent(scene, nodeId, [from, to])` returns the `chart.brush` event for a range along the brush column, or `undefined` when the node offers no brush. Its endpoint descriptions use the nearest plotted values and authored display strings from series whose `xColumn` is the brush column, including on an ordinal fallback.

## `SceneRenderer`

```ts
interface SceneRenderer<TOutput = unknown> {
  id: string; // 'elastic-charts', 'isomer-svg', 'echarts', …
  environments: Array<'browser' | 'node' | 'native'>;
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
```

This interface describes a renderer; it does not provide renderer selection or a fallback. `TOutput` is what the renderer produces, such as a React node.
`SceneRenderEnv` carries the `environment`, the node's `id`, and the host's `onEvent`, which receives each [`ChartEvent`](interactions.md#chartevent). Without `onEvent` a renderer offers no interaction.

`metricSingleValueScene`, `xyTimeSeriesScene` and `xyInteractiveScene` are hand-written Scenes for three schema examples, for building renderers before the resolver exists. They show the shape; they are not expected output. `xyInteractiveScene`'s selections raise exactly the events in `chartEventExamples`.
