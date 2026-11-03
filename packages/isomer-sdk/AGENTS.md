# SDK instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Primitive definitions, inference, brands, examples, or containers: [Primitives](docs/primitives.md).
- Parsing, normalization, validation, or recursive vocabularies: [Validate versus parse](docs/composition.md#validate-versus-parse) and the rest of that page.
- Schema/JSX projections or prompts: [Authoring](docs/authoring.md) and [JSON Schema](docs/composition.md#json-schema).
- Rendering, recursion, fallback, or sanitization: [Dispatch](docs/dispatch.md), [Rendering](docs/rendering.md), and [URL trust](docs/url-trust.md).

## When changing this area

Trace changed fields through definition, parsing, authoring projections, validation, and dispatch.

## Evidence required

For normalization changes, distinguish omitted, defaulted, transformed, and explicit values. For container changes, exercise nested foreign-pack nodes and diagnostic paths.

For public API, entry, peer, or build changes, use the applicable export, declaration, module-graph, and packed-consumer checks in [Contributing](../../CONTRIBUTING.md).
