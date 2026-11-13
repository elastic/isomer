---
navigation_title: Charts
description: Chart primitives on one shared core, a dashboard grid, and an unsupported placeholder, published for hosts and materializers to build against.
---

# Isomer charts

`@elastic/isomer-primitives-charts` is the published chart pack. It holds separate primitives per chart family over one shared core, a `grid` that lays nodes out as a Kibana dashboard does, and an `unsupported` placeholder for anything that cannot be shown.

A chart node is self-contained: its data is inline and typed, its data colors are concrete for both color schemes, and its formats come from one closed portable set. Whoever builds the node, a Kibana materializer or an agent, resolves everything a renderer would otherwise have to decide. Renderers translate; they never pick a data color or sort, and they format only through `formatAxisValue`. The chart engine chooses ticks, domains, stacks and point density from the intent the Scene states, except a vertical chart's time axis, whose two rows of ticks the Scene holds.

| Primitive | Holds |
| --- | --- |
| [`metric`](metric.md) | One headline value, or one tile per row, with an optional secondary value, progress bar or trend line |
| [`legacyMetric`](legacy-metric.md) | Large values with a label above or below each, as Lens's legacy metric draws them |
| [`xyChart`](xy-chart.md) | Lines, areas and bars over a shared x axis, with reference lines and annotations |
| [`dataTable`](data-table.md) | Rows and columns to read exactly, with colored cells, bars, sorting, paging and a summary row |
| [`partitionChart`](partition-chart.md) | Parts of a whole as a pie, donut, treemap, mosaic or waffle, in up to three layers |
| [`heatmap`](heatmap.md) | Cells by two dimensions, colored by value bands |
| [`gauge`](gauge.md) | One value on a scale, as a bullet or a dial, with colored ranges and a goal |
| [`tagCloud`](tag-cloud.md) | Words sized by value |
| [`grid`](grid.md) | Titled panels on a 48-column grid, in optional sections |
| [`unsupported`](unsupported.md) | A visible placeholder with a reason and a link |

Every chart primitive shares the [chart core](core.md): `title`, `description`, `data`, `colors`, `source` and `losses`, and declares its [interactions](interactions.md).

## Entries

| Entry | Holds |
| --- | --- |
| `@elastic/isomer-primitives-charts/schema` | The contracts: Zod schemas, node types, catalog entries and named examples. It imports no renderer. |
| `@elastic/isomer-primitives-charts/scene` | The [Scene](scene.md) types every renderer reads, the event helpers, `formatAxisValue` for tick labels, `timeTicksAt` for a time axis's ticks at a plot width, the [`CHART_GLYPHS`](core.md#glyphs) table, the `SceneRenderer` interface, and the [style helpers](rendering.md#styling) a chart engine authors its own rules with: `createVarsModule`, `varStyle`, `px`, `cls`, and the `LocalVarGroup` and `StyleHandle` types. |
| `@elastic/isomer-primitives-charts/resolve` | [`resolveChart`](scene.md#resolvechart), which builds a Scene from a node. |
| `@elastic/isomer-primitives-charts` | Everything above, plus the pack itself: `chartsPack`, [`createChartsPack`](rendering.md), its render context types, and the [size spec](rendering.md#chart-size) a renderer draws an unsized chart at. It imports React. |

```ts
import {
  metricExamples,
  metricSchema,
  type MetricNode,
} from '@elastic/isomer-primitives-charts/schema';
```

The schemas are object schemas for `definePrimitive`, which adds `id` and `surfaces` and closes each node to unknown keys; `grid` is a container and is bound to a composition's body-node union through `gridSchemaFor`. Validate a node inside a composition with a runtime that registers the pack, so nested nodes are checked against every pack the composition holds.

## Adding a field

A chart node carries everything a faithful rendering needs, and drawing it is the engine's job. When a chart does not match its source, that is a gap in an engine, never missing information in the node. A field belongs on a primitive when:

- **It says what it draws, in Isomer's terms.** Its description gives the values, units and effect a reader can check, never "as Lens does". A name borrowed from a source, such as an Elastic Charts fit or an EUI icon, is fine once the field defines it.
- **It carries what a faithful rendering needs, even if one engine alone can draw it.** An engine that cannot draw a field documents its fallback; the field stays.
- **An agent can choose it from the catalog alone**, without knowing the product a node may come from.
- **Its default is Isomer's.** A materializer states its source's value rather than relying on the default to match.
- **A renderer reads it.** What only a host acts on, such as a saved object id, belongs in opaque `source` meta.

## Where each entry loads

`./schema` reaches only zod and the SDK's React-free `./schema` entry, `./scene` adds Distillate for the style helpers an engine authors its few elements with, and `./resolve` adds nothing more, so all three load in browsers and on servers without React. `pnpm check:module-graph` checks it on every change. A chart engine imports only `./scene`: it draws a Scene, and never formats, validates or resolves one. ESLint enforces it in every `@elastic/isomer-charts-*` package.

## Rules

`z.toJSONSchema` drops refinements, so each cross-field rule is stated word for word in the description an agent reads, and a test checks that each check states its rule there. The rules are on each primitive's page.
