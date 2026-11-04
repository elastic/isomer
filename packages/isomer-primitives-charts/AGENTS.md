# Charts pack instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Any contract: [Charts](docs/index.md) and the page for the primitive, starting with the [chart core](docs/core.md).
- The Scene or a renderer: [Scene](docs/scene.md).
- Formatting: [Format](docs/format.md). `Intl` stays confined to `src/format/zone.ts`.
- A container, or anything nested in `grid`: the SDK's [Primitives](../isomer-sdk/docs/primitives.md#containers-schemafor-and-children).

## When changing this area

Schema changes are additive within a major version: hosts and the render service depend on the same published version. Keep each schema, its stated rules, its catalog entry, its examples and its docs page together. Make every cross-field check with `cross_field.ts`, whose rule sentence the description an agent reads must state.

Add or change a field only as [Adding a field](docs/index.md#adding-a-field) states. The spec carries everything a faithful rendering needs; an engine that cannot draw a field documents its fallback, and the field stays.

Expected values (formats, colors, orderings) come from this package's documented contract, written independently of its code, never from the code itself. Whether a materialized node matches its source panel is Kibana parity, tested in Kibana.

## Evidence required

Every example validates through the SDK in a composition. A new rule has a failing case at its path and is stated in the authoring schema.
