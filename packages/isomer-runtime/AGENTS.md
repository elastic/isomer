# Runtime instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Assembly or overrides: [Runtime](docs/runtime.md), especially [Construction order](docs/runtime.md#construction-order), and [Renderer overrides](docs/renderer-overrides.md).
- Surface output or diagnostics: [Surfaces](docs/surfaces.md), especially [Validation posture](docs/surfaces.md#validation-posture) and [Warnings are per surface](docs/surfaces.md#warnings-are-per-surface).
- Snapshot geometry or pages: [Snapshot boundary](docs/surfaces.md#a-snapshot-stops-at-markup-and-a-stylesheet) and [Frame](docs/frame.md).
- Views or mounted enhancements: [View registry](docs/view-registry.md), [React surface](docs/surfaces.md#react-returns-content-not-a-document), and [Embedding](docs/embedding.md).

## When changing this area

Check changed assembly across inventory, validation, authoring context, and output without imposing uniform surface semantics. Identify resource ownership before adding lifecycle behavior.

## Evidence required

Use a minimal pack/frame to exercise affected `render`/`renderNode` paths, validation modes, and frame/adapter presence or absence. For enhancement lifecycle changes, check mounted remount, option-change, and cleanup behavior.
