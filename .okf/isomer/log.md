# Directory Update Log

## 2026-09-27

- **Authoring schema and index**: `buildAuthoringJsonSchema` keeps Zod's `$defs` as generated, percent-encodes each `$ref` as a URI fragment, and refuses a primitive or extra def id that Zod's generated ids, the body-node union, or a shared def already takes, unless an extra def names that shared def's own schema. `PackAuthoringOptions.groups` indexes a pack's primitives; `definePrimitivePack` and `createIsomerRuntime` reject a group naming an unknown type or a type twice. `buildAuthoringPrompt` takes `catalog: 'index'`, `formatPrimitiveEntry` prints one entry, `authoringSchemaSubset` cuts the `$defs` some types reach, and the runtime's authoring context carries `groups` and `describePrimitives(types)`, which, like `schemaFor`, refuses more than 100 types with `TOO_MANY_TYPES`. `createAgentAuthoringContextFactory` returns an `AgentAuthoringContext` whose `schema` is always present.
- **One-line helpers**: `./author` exports `oneLine`, `jsonLine`, and `quoteInput` for text a host echoes into a prompt or message.
- **JSX**: `toComposition` converts author elements nested inside a prop's plain objects and arrays, a branded child item's props included, converts an object reached by several paths once, and refuses a value nested past 256 levels.
- **Validation**: A `ValidationError` carries `nodeType`, printed as `<path> (in <type>) <message>`. A misspelled type or enum value of at most 200 characters is answered with the closest option, a BigInt option prints as its literal, an unknown key with the fields the node takes, echoed input is quoted as one-line JSON, and `formatPath`, the listed options, and the listed fields quote a name that is not plain. `parse` and `validate` refuse input nested past 64 levels or holding more than 20,000 values, `enforceValidationMode` throws a `refused` result in either mode, and a result lists at most 50 errors plus a count of the rest.
- **Enhancements reach every renderer**: The HTML render resolves `enhancements` once, hands every renderer the set as `context.enhancements` through a view of the adapter's context, and emits each resolved enhancement's script itself, so a pack needs no adapter wiring for its enhancements. The runtime's combined style adapter builds its context as a view over each pack's, so a class-instance context keeps its methods and private state.

## 2026-09-25

- **Enhancement scripts in shadow roots**: Enhancement, adapter, and caller scripts are now function bodies with `root` in scope, each in its own function. The HTML surface gains `scripts: 'embedded' | 'host'` and returns `js`; the SDK root exports `runEnhancementScript` and `scopeScript`, the runtime scopes each pack adapter's script before joining them, and the SDK adds the `ENHANCEMENT_ROOT_MISSING` code. The embedding recipe renders with `scripts: 'host'`.
- **Node anchors**: A `react` renderer can spread `nodeAnchor(context, node)` on its root so runtime code finds the node with `findNodeElements`. Anchors render only when an enhancement declaring `anchors: true` resolves, or with the `anchors` HTML option. `EnhancementDefinition.script` is optional for host-driven enhancements.

## 2026-09-23

- **Creation**: Initial Isomer OKF v0.2 bundle covering the workspace, `@elastic/isomer-sdk`, `@elastic/isomer-runtime`, `@elastic/isomer-primitives-slides`, `@elastic/isomer-image-takumi`, and `@elastic/isomer-evals`.
- **License artifacts**: The generated runtime inventory now includes declared Takumi platform dependencies and fails when their notice or license text is unavailable.
