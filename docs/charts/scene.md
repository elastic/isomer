---
navigation_title: Scene
description: The Scene a chart node resolves to, and the SceneRenderer interface every chart engine implements.
---

# Scene

A chart node resolves to a **Scene**: everything a renderer draws, decided once. Colors are concrete for one scheme, every displayed string is formatted, ticks are chosen for the size, legend items and series are in order, and marks are in data space. Renderers read only the Scene, so text, colors and order are identical in every engine.

```ts
import type { Scene, SceneRenderer } from '@elastic/isomer-primitives-charts/scene';
```

## What every Scene holds

| Field | What it is |
| --- | --- |
| `kind` | `metric`, `xy` or `table` |
| `scheme` | `light` or `dark`. Always explicit: native targets have no CSS, so `light-dark()` is never the only source of a color |
| `size`, `locale`, `timeZone` | What the Scene was resolved for |
| `chrome` | Text, axis, grid-line, background and border colors |
| `summary` | One sentence on what the chart shows |
| `table` | The node's data as formatted text, in `data` order. Columns carry `role` and `empty`; an empty cell carries the empty-value text |
| `interactions` | What the node offers, resolved: selection targets, brush column, sync, link and emphasis |

A `MetricScene` has a `layout` and one tile per row. An `XyScene` has `axes` (domains and ticks with labels), `categories` (every x position with data), `series` in draw order with their marks, `referenceLines`, `annotations` and a `legend`.

## `resolveChart`

```ts
import { resolveChart } from '@elastic/isomer-primitives-charts/scene';

const scene = resolveChart(node, { scheme: 'dark', size: { width: 480, height: 240 } });
```

`resolveChart(node, { scheme, size?, locale?, timeZone? })` turns a `metric`, `xyChart` or `dataTable` node into its Scene ([how a table resolves](data-table.md#how-it-resolves)). It is pure and synchronous, and the Scene is plain JSON data, so it can be resolved on a server and shipped. `locale` defaults to `en` and `timeZone`, for dates whose format names none, to `UTC`. Every string comes from [Format](format.md), or from the node's `display` strings.

What it decides:

- **Colors** from the node, concrete for the scheme. Chrome and the default categorical palette come from one theme, EUI Borealis tokens (`CHART_CHROME`, `CATEGORICAL_PALETTE`). Text on a colored metric background is whichever scheme's text color contrasts more.
- **Metric tiles**, one per row: titles from the breakdown, colors by band (a percentage band reads each tile's share of its own `max`, or of the range across tiles), comparisons as Kibana's metric draws them (to the primary: the signed difference; to a baseline: the value, colored by the difference's sign), and three tiles per row unless `maxColumns` says otherwise.
- **Xy series** in layer, y-column and first-appearance order of split values; stacks (positive and negative values separately, percentages to one); categories in axis order; tooltips listing every visible series at an x.
- **Axes**: a domain including zero unless `fit` or `custom`, rounded out to the tick step; linear ticks at 1, 2 or 5 times a power of ten (one per 50 px on y, 100 px on x, five without a size); time ticks on round wall-clock times in the Scene's time zone; ordinal ticks thinned to one per 30 px. Tick labels use the column's format.
- **Selections** for each target the node offers, and none it does not.

Tick placement, legend statistic names and default reference-line and annotation colors are Isomer's choices for nodes that do not state them; the parity gates compare the result with Elastic Charts and refine them.

## Marks carry their rows and columns

Every selectable part of a Scene (a metric tile, an xy mark, a series, a legend item) carries a `source`: the row indexes into `data.rows` and the column ids it represents, built in the same pass as the mark. A renderer maps a gesture to an event through `source`, never through its own indexes, so alignment, helper series and duplicate labels cannot send a click to the wrong row.

Helper marks carry no `source` and are never selected: progress bars, trend lines, reference lines, annotations and the current-time marker.

## Selections and events

Where the node offers a selection target, the part a reader selects carries a `selection`: the event it raises, decided by the resolver.

```ts
interface SceneSelection {
  target: SelectTarget;
  rows: number[];                  // indexes into `data.rows`
  columns: string[];               // the dimension columns that identify the target
  values: Record<string, Cell>;    // their raw cells, which every row in `rows` shares
  description: string;
}
```

| Target | Carried by |
| --- | --- |
| `tile` | Each metric tile |
| `cell` | Each `dimension` cell of a table |
| `datum` | Each xy mark |
| `series` | Each xy series |
| `legend` | Each legend item |
| `category` | Each entry of an `XyScene`'s `categories`: every x position with data, in axis order, with its label as the x axis formats it |

A renderer raises events with two helpers, so every renderer raises the same event for the same gesture:

- `selectEvent(nodeId, selection, negate?)` returns the `chart.select` event for a selection.
- `brushEvent(scene, nodeId, [from, to])` returns the `chart.brush` event for a range along the brush column, or `undefined` when the node offers no brush. Its description names each end by the nearest x position in `categories`.

## `SceneRenderer`

```ts
interface SceneRenderer<TOutput = unknown> {
  id: string;                                  // 'elastic-charts', 'isomer-svg', 'echarts', …
  environments: Array<'browser' | 'node' | 'native'>;
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
```

`SceneRenderEnv` carries the `environment`, the node's `id`, and the host's `onEvent`, which receives each [`ChartEvent`](interactions.md#chartevent). Without `onEvent` a renderer offers no interaction.

Hosts pass a preference list. The first renderer that runs in the current environment and supports the Scene's kind draws it; the fallback supports every kind, so something always draws. `TOutput` is what the renderer produces, such as a React node. `selectSceneRenderer(preferences, kind, environment)` makes that choice, and [Rendering](rendering.md) covers where the pack takes the list from.

`metricSingleValueScene`, `xyTimeSeriesScene` and `xyInteractiveScene` are hand-written Scenes for three schema examples, for building renderers before the resolver exists. They show the shape; they are not expected output. `xyInteractiveScene`'s selections raise exactly the events in `chartEventExamples`.
