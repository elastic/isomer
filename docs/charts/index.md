---
navigation_title: Charts
description: Chart primitives on one shared core, a dashboard grid, and an unsupported placeholder, published for hosts and materializers to build against.
---

# Isomer charts

`@elastic/isomer-primitives-charts` is the published chart pack. It holds separate primitives per chart family over one shared core, a `grid` that lays nodes out as a Kibana dashboard does, and an `unsupported` placeholder for anything that cannot be shown.

A chart node is self-contained: its data is inline and typed, its data colors are concrete for both color schemes, and its formats come from one closed portable set. Whoever builds the node, a Kibana materializer or an agent, resolves everything a renderer would otherwise have to decide. Renderers translate; they never format, pick a data color, sort, or choose ticks.

| Primitive | Holds |
| --- | --- |
| [`metric`](metric.md) | One headline value, or one tile per row, with an optional secondary value, progress bar or trend line |
| [`xyChart`](xy-chart.md) | Lines, areas and bars over a shared x axis, with reference lines and annotations |
| [`dataTable`](data-table.md) | Rows and columns to read exactly, with colored cells, bars, sorting, paging and a summary row |
| [`grid`](grid.md) | Titled panels on a 48-column grid, in optional sections |
| [`unsupported`](unsupported.md) | A visible placeholder with a reason and a link |

Every chart primitive shares the [chart core](core.md): `title`, `description`, `data`, `colors`, `source` and `losses`, and declares its [interactions](interactions.md).

## Entries

| Entry | Holds |
| --- | --- |
| `@elastic/isomer-primitives-charts/schema` | The contracts: Zod schemas, node types, catalog entries and named examples. It imports no renderer. |
| `@elastic/isomer-primitives-charts/format` | The [formatter](format.md) every renderer and surface uses: Kibana's numeral, duration and date formats. |
| `@elastic/isomer-primitives-charts/scene` | The [Scene](scene.md) types every renderer reads, `resolveChart`, which builds a Scene from a node, and the `SceneRenderer` interface. |
| `@elastic/isomer-primitives-charts` | Everything above, plus the pack itself: [`createChartsPack`](rendering.md), its render context, and the shim every chart primitive renders through. It imports React. |

```ts
import {
  metricExamples,
  metricSchema,
  type MetricNode,
} from '@elastic/isomer-primitives-charts/schema';
```

The schemas are object schemas for `definePrimitive`, which adds `id` and `surfaces` and closes each node to unknown keys; `grid` is a container and is bound to a composition's body-node union through `gridSchemaFor`. Validate a node inside a composition with a runtime that registers the pack, so nested nodes are checked against every pack the composition holds.

## Rules

`z.toJSONSchema` drops refinements, so each cross-field rule is stated word for word in the description an agent reads, and a test checks that each check states its rule there. The rules are on each primitive's page.
