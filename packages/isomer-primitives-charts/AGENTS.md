# Charts pack instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Any contract: [Charts](docs/index.md) and the page for the primitive, starting with the [chart core](docs/core.md).
- The Scene or a renderer: [Scene](docs/scene.md).
- The resolver: [`resolveChart`](docs/scene.md#resolvechart). Colors it supplies itself come only from `src/scene/theme.ts`.
- Formatting: [Format](docs/format.md). Formats are `Intl` options and formatting is internal to the resolver. A host never formats at render time: host-specific formats, such as Kibana's field formats, map to a portable format or arrive as `data.display` strings.
- A container, or anything nested in `grid`: the SDK's [Primitives](../isomer-sdk/docs/primitives.md#containers-schemafor-and-children).

## When changing this area

Once the pack is published, schema changes are additive within a major version, because hosts and the render service depend on the same published version. Until then a rule may tighten when the contract calls for it. Keep each schema, its stated rules, its catalog entry, its examples and its docs page together. Make every cross-field check with `cross_field.ts`, whose rule sentence the description an agent reads must state.

Add or change a field only as [Adding a field](docs/index.md#adding-a-field) states. The spec carries everything a faithful rendering needs; an engine that cannot draw a field documents its fallback, and the field stays.

Expected values (formats, colors, orderings) come from this package's documented contract, written independently of its code, never from the code itself. Whether a materialized node matches its source panel is Kibana parity, tested in Kibana.

## Module rules

`./schema`, `./scene` and `./resolve` reach no React, Elastic Charts or runtime root; schemas import the SDK through `@elastic/isomer-sdk/schema`, never its root. `pnpm check:module-graph` enforces it. Chart engines (`@elastic/isomer-charts-*`) import only `./scene`, which holds the Scene types and event helpers; ESLint enforces it.

## Evidence required

Every example validates through the SDK in a composition. A new rule has a failing case at its path and is stated in the authoring schema.
