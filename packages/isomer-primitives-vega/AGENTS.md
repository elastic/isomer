# Vega pack instructions

Read the [root instructions](../../AGENTS.md) first, and the [charts pack's](../isomer-primitives-charts/AGENTS.md) for the conventions this pack shares.

## Read before changing

- The node, its rules or its events: [Vega](docs/index.md).
- Rendering, the theme, size, styling, images or the benchmark: [Rendering](docs/rendering.md).
- What a host does before Isomer sees a node: [Materializing](docs/materializing.md).

## When changing this area

The pack is a separate pack from the charts pack and depends on its `./schema` and `./resolve` entries for the shared contracts (`data`, provenance, losses, `ChartEvent`) and the table text; the charts pack never depends on Vega. Vega is not a `SceneRenderer`: the seam is the SVG string `renderVegaSvg` returns.

`./schema` reaches no Vega, React, runtime or Markdown parser, and builds on the SDK's and the charts pack's `./schema` entries alone; `pnpm check:module-graph` enforces it. Every value the pack adds to a spec's `config` comes from `src/render/theme.ts`, which is Kibana's Vega defaults with EUI Borealis tokens and is tested against the theme package; every length the pack draws comes from `src/render/layout.ts`.

A spec is untrusted at every layer. Never let validation, render or hydration fetch: keep the spec walk, the loader, the scene scrub and the SVG check in step, and add a failing case for any new way a spec could reach out. Expressions run only through `vega-interpreter`.

Pin `vega*` versions to what Kibana resolves, and update the root `pnpm.overrides` and `patches/vega-canvas@*.patch` together.

## Evidence required

Every example validates and draws on every surface (`src/primitive.test.ts`). A change to drawing passes the rendering corpus (`src/corpus/corpus.test.ts`), which holds the pack to Vega's own `toSVG()`. A change to events passes `src/events.test.ts` and `e2e/hydrate.spec.ts`. A change to what a chart costs reruns `bench:check`.
