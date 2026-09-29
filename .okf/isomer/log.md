# Directory Update Log

## 2026-09-29

- **Slack fallback reads GFM escapes**: `gfmToSlackMrkdwn` and `gfmToSlackBlocks` read a backslash escape or a numeric character reference as the character it stands for, in prose, emphasis, link labels and destinations, headings, and table cells. Code spans keep their backslashes, except before a pipe in a table cell. An escaped delimiter is never converted to formatting, though Slack may still format a literal pair itself, and a table row splits only on unescaped pipes. A destination is decoded before the URL policy reads it.
- **Takumi `measure`**: `createTakumiImageBackend` returns a `TakumiMeasuringBackend` whose `measure(input)` lays the input out as `png` would and returns a `LayoutBox` tree of canvas boxes, axis scales, text runs, and each element's attributes, so a node anchor comes back on its box. `TakumiImageBackend` and `renderPng` are unchanged.
- **Own keys in the authoring schema**: `buildAuthoringJsonSchema` reads and writes only own keys, so a `describe` entry, def id, or property named `__proto__` never reaches `Object.prototype` or drops out of the schema.
- **Slack envelope clamps every block's text**: `renderSlackEnvelope` clamps each Slack-limited text in the blocks a renderer returns, not just asset-image alt text. `SLACK_LIMITS` gains `imageTitleChars`, `videoTitleChars`, `videoDescriptionChars`, `videoAuthorNameChars`, `buttonTextChars`, `placeholderChars`, and `optionGroupLabelChars`. `clampSlackText` cuts at a grapheme boundary, so it never splits a surrogate pair or emoji sequence.
- **Releases follow published packages**: The workspace semantic-release plugin runs the commit analyzer and notes generator over only the commits that change a package published now or at the last release, a root build input, the root `build` scripts, or a published package's reference in `tsconfig.workspace.json`, so slides-pack, docs, and tooling commits no longer cut a release. The publish playbook lists all four published packages.
- **`!` marks a breaking change**: `.releaserc.json` adds a `breakingHeaderPattern` to the angular preset's parser options, so a `feat!:` or `fix(scope)!:` header drives a major release and lands under breaking changes in the notes without a `BREAKING CHANGE` footer.

## 2026-09-28

- **Enhancements on the React surface**: `ReactRenderOptions.enhancements` takes enhancement definitions; those that apply reach every renderer as `context.enhancements`, turn node anchors on when one asks, and run their scripts against the wrapper section once it mounts. The SDK's React entry adds `applyEnhancements`, and `findNodeElementPairs` lists each node occurrence with its anchored element, so a node object used twice pairs twice. The embedding doc covers a React host with a Distillate live collection, and the slides pack takes `@elastic/distillate` `^0.2.0`.
- **Unique JSX component names**: `buildJsxShim` throws `DUPLICATE_PRIMITIVE_TYPE`, naming both types, when two primitive or child types capitalize to one component name or a type collides with the root `Composition`.
- **`toComposition` keeps `version`**: The JSX shim carries the root element's `version` onto the composition alongside `title`, `subtitle`, `theme`, and `meta`.
- **Validation errors name their node**: `ValidationError` gains `nodeType`, the innermost primitive node its path lands in, set by the parser, the validator, the duplicate-id pass, and a dispatcher's `validate`. `formatValidationError` prints `<path> (in <nodeType>) <message>`, and an unknown key on a node lists that node's declared fields. Names and ids a finding echoes are JSON-quoted when not plain, with line terminators escaped.
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
