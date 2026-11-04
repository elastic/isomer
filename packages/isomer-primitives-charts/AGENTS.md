# Charts pack instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Any contract: [Charts](docs/index.md) and the page for the primitive, starting with the [chart core](docs/core.md).
- The Scene or a renderer: [Scene](docs/scene.md).
- The resolver: [`resolveChart`](docs/scene.md#resolvechart). Colors it supplies itself come only from `src/scene/theme.ts`.
- Formatting: [Format](docs/format.md). `Intl` stays confined to `src/format/zone.ts`.
- A container, or anything nested in `grid`: the SDK's [Primitives](../isomer-sdk/docs/primitives.md#containers-schemafor-and-children).

## When changing this area

Schema changes are additive within a major version: hosts and the render service depend on the same published version. Keep each schema, its stated rules, its catalog entry, its examples and its docs page together. Make every cross-field check with `cross_field.ts`, whose rule sentence the description an agent reads must state.

Expected values (formats, colors, orderings) come from Kibana's source or tests, never from this package's own code.

## Evidence required

Every example validates through the SDK in a composition. A new rule has a failing case at its path and is stated in the authoring schema.
