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
| `kind` | `metric` or `xy` |
| `scheme` | `light` or `dark`. Always explicit: native targets have no CSS, so `light-dark()` is never the only source of a color |
| `size`, `locale`, `timeZone` | What the Scene was resolved for |
| `chrome` | Text, axis, grid-line, background and border colors |
| `summary` | One sentence on what the chart shows |
| `table` | The node's data as formatted text, in `data` order. Columns carry `role` and `empty`; an empty cell carries the empty-value text |
| `interactions` | What the node offers, resolved: selection targets, brush column, sync, link and emphasis |

A `MetricScene` has a `layout` and one tile per row. An `XyScene` has `axes` (domains and ticks with labels), `categories` (every x position with data), `series` in draw order with their marks, `referenceLines`, `annotations` and a `legend`.

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

Hosts pass a preference list. The first renderer that runs in the current environment and supports the Scene's kind draws it; the fallback supports every kind, so something always draws. `TOutput` is what the renderer produces, such as a React node.

`metricSingleValueScene`, `xyTimeSeriesScene` and `xyInteractiveScene` are hand-written Scenes for three schema examples, for building renderers before the resolver exists. They show the shape; they are not expected output. `xyInteractiveScene`'s selections raise exactly the events in `chartEventExamples`.
