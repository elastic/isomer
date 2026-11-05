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
| `table` | The node's data in `data` order. Formatted `cells` serve text surfaces; raw `values` are in matching column order so renderers can raise events without parsing display text |
| `interactions` | What the node offers, resolved: selection targets, brush column, sync, link and emphasis |

A `MetricScene` has a `layout` and one tile per row. An `XyScene` has `axes` (domains and ticks with labels), `layers` in exact draw order, and a `legend`. Each layer is a resolved series, reference line or annotation; helper marks are interleaved with series in the order they appear in the chart.

## Marks carry their rows and columns

Every selectable part of a Scene (a metric tile, an xy mark, a series, a legend item) carries a `source`: the row indexes into `data.rows` and the column ids it represents, built in the same pass as the mark. The table keeps each row's raw `values` alongside its formatted `cells`. A renderer maps a gesture to an event through `source` and those raw values, never through its own indexes or parsed display text, so alignment, helper series and duplicate labels cannot send a click to the wrong row.

Each `XySeries` also carries its `series` reference: the index of its data layer and y entry, uniquely identifying the series even when different layers share the same series key.

Helper marks carry no `source` and are never selected: progress bars, trend lines, reference lines, annotations and the current-time marker.

## `SceneRenderer`

```ts
interface SceneRenderer<TOutput = unknown> {
  id: string;                                  // 'elastic-charts', 'isomer-svg', 'echarts', …
  environments: Array<'browser' | 'node' | 'native'>;
  supports(kind: SceneKind): boolean;
  render(scene: Scene, env: SceneRenderEnv): TOutput;
}
```

This interface describes a renderer; it does not provide renderer selection or a fallback. `TOutput` is what the renderer produces, such as a React node.
`SceneRenderEnv` carries the `environment`, the node's `id`, and the host's `onEvent`, which receives each [`ChartEvent`](interactions.md#chartevent). Without `onEvent` a renderer offers no interaction.

`metricSingleValueScene` and `xyTimeSeriesScene` are hand-written Scenes for two schema examples, for building renderers before the resolver exists. They show the shape; they are not expected output.
