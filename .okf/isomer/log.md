# Directory Update Log

## 2026-09-28

- **Unique JSX component names**: `buildJsxShim` throws `DUPLICATE_PRIMITIVE_TYPE`, naming both types, when two primitive or child types capitalize to one component name or a type collides with the root `Composition`.
- **`heading` on text, markdown, and slack**: `renderTextEnvelope`, `renderMarkdownEnvelope`, and `renderSlackEnvelope` take `heading` (default `true`) through the new `TextEnvelopeOptions` and `MarkdownEnvelopeOptions` and the existing `SlackEnvelopeOptions`; `false` leaves out the title and subtitle, and Slack's fallback `text` with them. The runtime's `TextRenderOptions` and `MarkdownRenderOptions` extend those types, and `SlackRenderNodeOptions` omits `heading`.
- **Index catalog and primitive lookups**: A pack declares `authoring.groups`, the authoring prompt prints `catalog: 'index'` as one line per primitive under those groups with `schema` optional, and the runtime's authoring context adds `groups` and `describePrimitives(types)`, backed by the SDK's `authoringSchemaSubset` and `formatPrimitiveEntry`. Every catalog and registered-view line collapses line terminators, and each code span is fenced longer than any backtick run inside it.

## 2026-09-27

- **Enhancements reach every renderer**: The HTML render resolves `enhancements` once, hands every renderer the set as `context.enhancements` through a view of the adapter's context, and emits each resolved enhancement's script itself, so a pack needs no adapter wiring for its enhancements. The runtime's combined style adapter builds its context as a view over each pack's, so a class-instance context keeps its methods and private state.

## 2026-09-25

- **Enhancement scripts in shadow roots**: Enhancement, adapter, and caller scripts are now function bodies with `root` in scope, each in its own function. The HTML surface gains `scripts: 'embedded' | 'host'` and returns `js`; the SDK root exports `runEnhancementScript` and `scopeScript`, the runtime scopes each pack adapter's script before joining them, and the SDK adds the `ENHANCEMENT_ROOT_MISSING` code. The embedding recipe renders with `scripts: 'host'`.
- **Node anchors**: A `react` renderer can spread `nodeAnchor(context, node)` on its root so runtime code finds the node with `findNodeElements`. Anchors render only when an enhancement declaring `anchors: true` resolves, or with the `anchors` HTML option. `EnhancementDefinition.script` is optional for host-driven enhancements.

## 2026-09-23

- **Creation**: Initial Isomer OKF v0.2 bundle covering the workspace, `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-primitives-slides`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-evals`.
- **License artifacts**: The generated runtime inventory now includes declared Takumi platform dependencies and fails when their notice or license text is unavailable.
