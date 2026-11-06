---
navigation_title: Charts
description: Chart primitives on one shared core, a dashboard grid, and an unsupported placeholder, published for hosts and materializers to build against.
---

# Isomer charts

`@elastic/isomer-primitives-charts` is the published chart pack. It holds separate primitives per chart family over one shared core, a `grid` that lays nodes out as a Kibana dashboard does, and an `unsupported` placeholder for anything that cannot be shown.

A chart node is self-contained: its data is inline and typed, its data colors are concrete for both color schemes, and its formats come from one closed portable set. Whoever builds the node, a Kibana materializer or an agent, resolves everything a renderer would otherwise have to decide. Renderers translate; they never pick a data color or sort, and they format only through `formatAxisValue`. The chart engine chooses ticks, domains, stacks and point density from the intent the Scene states.

| Primitive | Holds |
| --- | --- |
| [`metric`](metric.md) | One headline value, or one tile per row, with an optional secondary value, progress bar or trend line |
| [`xyChart`](xy-chart.md) | Lines, areas and bars over a shared x axis, with reference lines and annotations |
| [`grid`](grid.md) | Titled panels on a 48-column grid, in optional sections |
| [`unsupported`](unsupported.md) | A visible placeholder with a reason and a link |

Every chart primitive shares the [chart core](core.md): `title`, `description`, `data`, `colors`, `source` and `losses`, and declares its [interactions](interactions.md).

## Entries

| Entry | Holds |
| --- | --- |
| `@elastic/isomer-primitives-charts/schema` | The contracts: Zod schemas, node types, catalog entries and named examples. It imports no renderer. |
| `@elastic/isomer-primitives-charts/scene` | The [Scene](scene.md) types every renderer reads, the event helpers, `formatAxisValue` for tick labels, the [`CHART_GLYPHS`](core.md#glyphs) table, and the `SceneRenderer` interface. |
| `@elastic/isomer-primitives-charts/resolve` | [`resolveChart`](scene.md#resolvechart), which builds a Scene from a node. |
| `@elastic/isomer-primitives-charts` | Everything above. |

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

`./schema` and `./scene` reach only zod and the SDK's React-free `./schema` entry, so they load in browsers, on servers and on React Native's Hermes. The build checks it on every change. Renderers import only the Scene from `./scene`, never the formatter, the schemas or the resolver.

Renderer imports may use inferred named Scene types or explicit `import type` forms, including type-only namespaces. Resolver values and runtime namespace imports remain excluded.

## Rules

`z.toJSONSchema` drops refinements, so each cross-field rule is stated word for word in the description an agent reads, and a test checks that each check states its rule there. The rules are on each primitive's page.
