# Charts pack instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Any contract: [Charts](docs/index.md) and the page for the primitive, starting with the [chart core](docs/core.md).
- The Scene or a renderer: [Scene](docs/scene.md).
- The pack, its render context, or renderer selection: [Rendering](docs/rendering.md).
- The resolver: [`resolveChart`](docs/scene.md#resolvechart). Colors it supplies itself come only from `src/theme/palette.ts`.
- Formatting: [Format](docs/format.md). Formats are `Intl` options and formatting is internal to the pack: the resolver, and `formatAxisValue` for the ticks an engine chooses. A host never formats at render time: host-specific formats, such as Kibana's field formats, map to a portable format or arrive as `data.display` strings.
- A container, or anything nested in `grid`: the SDK's [Primitives](../isomer-sdk/docs/primitives.md#containers-schemafor-and-children).

## When changing this area

Once the pack is published, schema changes are additive within a major version, because hosts and the render service depend on the same published version. Until then a rule may tighten when the contract calls for it. Keep each schema, its stated rules, its catalog entry, its examples and its docs page together. Make every cross-field check with `cross_field.ts`, whose rule sentence the description an agent reads must state.

Add or change a field only as [Adding a field](docs/index.md#adding-a-field) states. The spec carries everything a faithful rendering needs; an engine that cannot draw a field documents its fallback, and the field stays.

Expected values (formats, colors, orderings) come from this package's documented contract, written independently of its code, never from the code itself. Whether a materialized node matches its source panel is Kibana parity, tested in Kibana.

## Module rules

`./schema`, `./scene` and `./resolve` reach no React, Elastic Charts, runtime or Markdown parser, and `./schema` and `./resolve` no Distillate either, which only style modules and renderers load, and the pack's source never imports it by its own package name; schemas import the SDK through `@elastic/isomer-sdk/schema`, never another SDK entry. `pnpm check:module-graph` enforces it, and `scripts/module_graph_rules.test.js` tests its rules. `./testing` alone reaches the runtime and `react-dom`, its optional peers; `.` never does. Chart engines (`@elastic/isomer-charts-*`) import only `./scene`, which holds the Scene types and event helpers, statically, with `import()` or with `require`, and never by a path into the pack; ESLint enforces it, and `scripts/chart_engine_imports.test.js` tests the rule.

The published entries are `src/entries/*`, hand-curated as the SDK's are. Each directory's `index.ts` is its internal barrel, exporting only what other directories use, and another directory imports it, never one of its files; ESLint enforces it outside tests. A primitive's `index.ts` reaches React and depends on `render/`, so only `src/pack.ts`, `src/entries/index.ts` and `src/testing/` import it. The modules the React-free entries reach, the shared directories the barrels depend on, and the aggregators in `src/primitives/` import a primitive's files instead. `src/entries/scene.ts` imports `render/cls.ts` directly, since `render/index.ts` reaches React.

Each primitive is a folder under `src/primitives/`, laid out as the slides pack's are ([Authoring a primitive](../isomer-primitives-slides/docs/primitives.md#file-layout)): its `schema`, `examples` and `catalog` (for `./schema`), `icon`, `scene` (for `./scene`), `resolve` (for `./resolve`), and any in-pack `react` renderer, with their tests. Folder-local exports use the `definePrimitive` keys; its `index.ts` aliases them to their public names. Its `index.ts` defines the primitive with `definePrimitive` from `src/primitives/define.ts`. A chart primitive's exports `define<Type>Primitive(config)`, which `createChartsPack` builds from, and `<type>Primitive`, built with `defaultChartPrimitiveConfig` from `src/primitives/defaults.ts`, which `chartsPack` registers; both spread `chartPrimitiveParts` from `render/`. `resolveChart` and `ChartNode`, over every chart primitive, are in `src/primitives/resolve_chart.ts`. `src/pack.test.ts` fails when a folder is unregistered or a type is in no authoring group. What several primitives share stays in `src/format/`, `src/render/`, `src/resolve/`, `src/scene/`, `src/schema/`, `src/styles/`, `src/text/` and `src/theme/`.

## Evidence required

Every example validates through the SDK in a composition. A new rule has a failing case at its path and is stated in the authoring schema. A new chart primitive or example passes the [parity gates](docs/rendering.md#parity-gates) (`src/surface_parity.test.ts`, `src/renderer_parity.test.ts`).
