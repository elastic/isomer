# API reference

What each entry point exports, and which ones cost you a dependency.

## Entry points

| Entry | Loads | Reach for it when |
| --- | --- | --- |
| `.` | zod and React runtimes | Defining primitives, packs, frames; validating |
| `./html` | `react-dom/server` | Rendering HTML, writing a style adapter |
| `./text` | zod only | Text envelopes |
| `./markdown` | zod only | Markdown envelopes and formatting |
| `./slack` | zod only | Block Kit types, limits, asset collection |
| `./react` | react | React content helpers and dispatcher context |
| `./author` | React | JSX/builder front ends, agent prompts |
| `./testing` | Node assert | Pack conformance harness |

## Root entry — contracts

| Export | What it is |
| --- | --- |
| `definePrimitive` | Builds a `PrimitiveDefinition`; adds `id` and `surfaces` to its schema and closes it to unknown keys |
| `definePrimitiveFor` | `definePrimitive` bound to one pack's `PackTypes` |
| `definePrimitivePack` | Builds a `PrimitivePack`; infers `TTheme` from `themeBound` |
| `themeBound` | Inference carrier so a pack declares its palette at the definition |
| `composePacks` | Flattens packs into one frozen inventory; rejects cross-pack duplicates |
| `extendPrimitivePack` | Adds primitives to a pack, keeping its declared surfaces |
| `bindFrame` | Erases a `Frame<TTheme>` into a `BoundFrame` |
| `describeCapabilities` | Reports primitives, formats, and enhancements for a set of packs |
| `unresolvedBodyNodeSchema` | The child slot in a container's standalone schema |

Types: `PrimitiveDefinition`, `AnyPrimitiveDefinition`, `PrimitiveNode`, `PrimitiveSchema` (a `ZodObject`), `PrimitiveCatalogEntry`, `PrimitiveMetrics`, `PrimitiveChildRef`, `PrimitiveRenderContext`, `StyledRenderContext`, `PrimitiveStyleCollector`, `PrimitiveStyleCollectionContext`, `PackTypes`, `DefaultPackTypes`, `Renderer` (`(node, env)` — `env` is `SurfaceMap<T>[S]['env']`), `Renderers`, `RenderScope`, `ReactContextArg` (the context parameter a `react` renderer receives), `SurfaceMap`, `SurfaceName`, `OptionalSurface`, `PrimitivePack`, `AnyPrimitivePack`, `PrimitivePackInput`, `PackStyleAdapter`, `PackAuthoringOptions`, `ComposedPacks`, `Frame`, `FrameBody`, `BoundFrame`, `FrameDispatcher`, `FrameHeader`, `FrameComposition`, `FrameViewport`, `ThemePair`, `EnhancementDefinition`, `HostCapabilities`, `StyleHandle`, `ThemeTokenPath`, `SvgRenderThemeBase`, `Composition`, `BodyNode` (the same type as `PrimitiveNode`, kept for hosts that name body nodes), `BodyNodeBase`, `BodyNodeSurface`, `ActionEventRef`, `IsomerError`, `IsomerErrorCode`.

`react` and `svg` renderers receive `env.theme`: the frame's resolved palette (`T['theme']`) when reached through the `svg` surface, `undefined` outside one. A pack whose `svg` renderers read tokens still declares `theme: themeBound<TTheme>()` on its pack input. `PrimitivePackInput.authoring` (a `PackAuthoringOptions`) is this pack's own contribution — `describe` and `omitProperties` — to the runtime's merged authoring schema.

## Root entry — dispatch

| Export | What it is |
| --- | --- |
| `createPrimitiveDispatcher` | Builds a `PrimitiveDispatcher` from a definition list; `PrimitiveDispatcherOptions` carries its `label` |
| `createChildNodeWalker` | Builds a `ChildNodeWalker`, which yields a `ChildNodeRef` (`{ node, path }`) per nested node across a heterogeneous inventory |
| `mapCompositionNodes` | Rebuilds a composition's body with `fn` applied to every node, nested children included |
| `childNodePath` | Joins a parent path with a child's own fragment |
| `someBodyNode` | Predicate over a body, following children |
| `isVisibleOnSurface`, `rendersOnSurface` | Surface-visibility checks |
| `nodeAnchor`, `NODE_ANCHOR_ATTRIBUTE` | Props a `react` renderer spreads on its root so its element can be found; empty unless `context.anchors` is set |
| `findNodeElements` | Pairs a body's nodes with their anchored elements under a DOM root |
| `anchorValue` | A node type as its anchor carries it, percent-encoded so HTML parsing leaves it unchanged |
| `BODY_NODE_SURFACES` | `['react','svg','text','markdown','slack']` |

## Root entry — composition and validation

| Export | What it is |
| --- | --- |
| `createCompositionValidator` | Trusted-input validator: schema plus semantic passes; returns `{ valid, errors, warnings }` |
| `createCompositionParser` | Untrusted-input parser: schema only |
| `enforceValidationMode` | Throws `CompositionValidationError` only on `'throw'` |
| `IsomerError` | Construction and authoring failures, identified by `name` and `code`. Codes name the condition, not the throwing module. |
| `CompositionValidationError` | Invalid composition, identified by `name`, `code` (`COMPOSITION_INVALID`), and `errors` |
| `formatValidationError` | `{ path, message }` as one `<path> message` string |
| `warningsForSurface` | Narrows warnings to one surface |
| `resolveVocabulary` | Builds a union whose containers reference it |
| `getCompositionSchemaForDefinitions` | Memoized schema, keyed on array identity |
| `buildCompositionJsonSchema` | Draft-2020-12 projection for hosts that validate outside TypeScript |
| `buildAuthoringJsonSchema` | Agent-facing projection: named shared defs, inlined scalars, no `id`/`surfaces` |
| `formatZodIssue`, `formatZodIssues`, `formatPath` | Zod issues as `ValidationError`s |

Types: `ValidationError`, `ValidationResult`, `ValidationWarning`, `ValidationErrorMode`, `CompositionValidatorOptions`, `ParsedComposition` (`{ valid, errors, composition? }`), `ResolvedVocabulary`, `CompositionSchemaOptions`, `CompositionJsonSchemaOptions`, `AuthoringJsonSchemaOptions`, `IsomerErrorCode`.

## Root entry — values, URLs, helpers

`assetUrl`, `navigationHref`, `sanitizeAssetUrl`, `sanitizeNavigationHref`, `ASSET_URL_MESSAGE`, `NAVIGATION_HREF_MESSAGE`, `BLOCKED_HREF` — see [URL trust](url-trust.md).

`displayValueSchema`, `structuredValueSchema`, `namedColorSchema`, `renderThemeSchema`, `formatDisplayValue` (with `FormatDisplayValueOptions`), `isStructuredValue`, `rawDisplayValue`, `STRUCTURED_VALUE_FORMATS`, `ALL_NAMED_COLORS`, `ISOMER_ERROR_CODES`, plus `formatCompactNumber` and `byteLength` (which measures into a `PayloadMeasurement`).

`runEnhancementScript` takes a `scripts: 'host'` render's `js` and the `.isomer` section the host inserted, and runs the one against the other. `scopeScript` wraps one script body in its own function, for anything that joins bodies, such as a runtime combining several packs' `getScriptText`. Both live here rather than on `./html` because neither needs the server renderer. See [Enhancements](rendering.md#enhancements).

Value types: `DisplayValue`, `StructuredValue`, `StructuredValueFormat`, `NamedColor`, `NamedColorPalette`, `RenderTheme` (`'light' | 'dark' | 'auto'`).

Zod helpers so a pack states constraints the same way everywhere: `z`, `enumOf`, `requiredString`, `optionalString`, `finiteNumber`, `nonNegativeFiniteNumber`, `positiveFiniteNumber`.

## `./html`

`renderHTMLWithDispatcher`, `renderCompositionContent`, `useReactPrimitiveDispatcher`, `createDistillateHtmlStyleAdapter`, and the types a style adapter is written against: `HTMLStyleAdapter`, `DistillateHtmlEngine`, `DistillateThemeVar`, `HTMLRenderOptions`, `HTMLRenderResult`, `HTMLRenderDispatcher`, `HTMLDispatcherRenderOptions`, `HTMLEnhancementScope`, `EnhancementDefinition`, `ReactContentDispatcher`, `ReactContentOptions`. `HTMLRenderOptions.enhancements` is a list of enhancement ids; `resolveEnhancements` intersects it with what the body contains and `enhancementScript` concatenates the survivors' scripts, each in its own function scope, and `rendersAnchors` says whether a render carries node anchors. `HTMLRenderOptions.anchors` turns anchors on directly, for tests. `DISTILLATE_STYLE_COLLECTOR` is the `styleCollector` tag the Distillate adapter publishes, and `flattenSchemeOption` reduces a Distillate light/dark scheme option to one value.

## `./react`

`PrimitiveDispatcherContext`, `useReactPrimitiveDispatcher`, `renderCompositionContent`, `wrapCompositionContent` (the `.isomer[.framed][.fluid]` `section` the `html` surface's wrapper also emits, for a React-only host; `CompositionWrapperOptions` carries `framed`, `fluid`, `theme`, `defaultAriaLabel`), and the dispatcher/context types used by React renderers: `ReactContentDispatcher`, `ReactContentOptions`, `ReactTreeDispatcher`.

## `./text`, `./markdown`, `./slack`

`./text` — `renderTextEnvelope` and `TextEnvelopeDispatcher`. Text formatting is pack-owned; the SDK ships no house style.

`./markdown` — `renderMarkdownEnvelope`, `MarkdownEnvelopeDispatcher`, `boldLabelPrefix`, `boldSectionLabel`, `defaultMarkdownFromText`, and the URL-policed formatters `markdownLink`, `markdownImage`, `markdownLinkWrap`, `sanitizeMarkdownSource`.

`./slack` — `renderSlackEnvelope` with `SlackEnvelopeOptions` and `SlackEnvelopeResult`, `SlackEnvelopeDispatcher`, `SLACK_LIMITS`, `createSlackAssetCollector` (`{ prefix? }`), `SlackAssetCollector`, `SlackAssetRequest`, `SlackFileReference`, `isSlackReachableImageUrl`.

Block Kit types: `SlackBlock` and its variants `SlackHeaderBlock` (`SlackHeaderLevel`), `SlackSectionBlock` (`SlackSectionAccessory`), `SlackContextBlock`, `SlackDividerBlock`, `SlackImageBlock`, `SlackVideoBlock`, `SlackActionsBlock` (`SlackActionElement`), `SlackTableBlock` (`SlackTableCell`, `SlackTableColumnSetting`, `SlackRawTextElement`), `SlackRichTextBlock` (`SlackRichTextBlockElement`, `SlackRichTextSection`, `SlackRichTextList`, `SlackRichTextPreformatted`, `SlackRichTextQuote`, `SlackRichTextInline`, `SlackRichTextText`, `SlackRichTextLink`, `SlackRichTextTag`, `SlackRichTextStyle`, `SlackTagColor`); text objects `SlackTextObject`, `SlackPlainTextObject`, `SlackMrkdwnTextObject`; elements `SlackButtonElement`, `SlackImageElement`, `SlackStaticSelectElement`, `SlackMultiStaticSelectElement`, `SlackOverflowElement`, `SlackRadioButtonsElement`, `SlackCheckboxesElement`, `SlackOptionObject`, `SlackOptionGroup`.

mrkdwn formatters: `escapeMrkdwn`, `bold`, `italic`, `strike`, `code`, `codeBlock`, `link`, `clampSlackText`, `formatHeaderText`, `joinMrkdwn`, `gfmToSlackMrkdwn`, `gfmToSlackBlocks`. Element constructors, each clamped to the Slack budget: `slackPlainText`, `slackActionId`, `slackSelectOption` (`SlackSelectOptionInput`), `slackStaticSelect`, `slackOverflowElement` (`SlackOverflowOptionInput`), `slackUrlButton`, `slackButtonStyle`.

## `./author`

JSX: `fromChildren`, `fromTextChildren`, `AuthoredChildBrand`, `AuthoredTextBrand`, `AuthorChildContext`, `defineAuthorComponent`, `AuthorComponent`, `authorType`, `getAuthorType`, `buildJsxShim`, `JsxShim`, `PrimitiveComponentMap`, `CompositionAuthorProps`, `AuthorComposition`, `flattenChildren`, `textFromChildren`, `withoutChildren`, `itemsFromChildren`, `requireAuthorElement`.

Object builders: `defineNodeBuilder` (a `NodeBuilder` taking a `BuilderInput`, the node without `type`), `buildObjectBuilders` (a `BuilderMap`, one builder per primitive typed from its schema).

Agent prompts: `buildAuthoringPrompt` (`AuthoringPromptContext`), `createAuthoringPromptBuilder`, `createAgentAuthoringContextFactory` (`AgentAuthoringContextOptions`, `AgentAuthoringContextDefaults`), `AUTHORING_PROFILE_IDS` (`AuthoringProfileId`), `AuthoringViewSummary`. `WithNodeFields` is on the root entry, next to `definePrimitive`.

## `./testing`

`runPrimitiveInventoryConformance` checks the inventory itself: every definition has an example, each example's `type` matches, and `catalog.example` parses or matches a published example. `examplesFromDefinitions` flattens definitions to one `PrimitiveConformanceExample` per example; `primitiveConformanceCases` is the list of `PrimitiveConformanceCase`s; `primitiveConformanceRows` crosses the two for `it.each`. `CONFORMANCE_FOREIGN_MARKER` is the string a container's `nestForeignChild` case checks for. `assertPackRegistrationComplete` (`PackRegistrationOptions`) separately checks that every directory under a pack's `src/primitives/` is registered.

### The harness contract

A pack supplies a `PrimitiveConformanceHarness` closing over its own dispatcher, frame, and theme. Unsuffixed members take one node; `Composition`-suffixed members take the whole composition.

| Member | Required | Contract |
| --- | --- | --- |
| `wrapComposition` | yes | Smallest composition holding one node, titled `'Conformance fixture'` |
| `validateNode`, `validateComposition` | yes | Validation errors for a node; whole-composition `ValidationResult` |
| `renderReact`, `collectStyles` | yes | Must not throw; `renderReact` returns something other than `undefined` |
| `renderText`, `renderMarkdown` | yes | Non-whitespace strings |
| `renderSlack` | yes | At least one block; the markdown fallback counts |
| `renderTextComposition`, `renderMarkdownComposition` | yes | Whole-composition envelopes, title included |
| `renderSlackComposition` | yes | A `PrimitiveConformanceSlackResult` led by a `plain_text` header block |
| `renderSvg`, `estimateSvgHeight` | no | Skipped when absent; `sizesFromNodeHeights: false` also skips the height case |
| `renderHTML` | no | Honors `PrimitiveConformanceHtmlOptions` (`css`, `names`); skipped when absent |
| `assertVarRefsHaveDeclarations` | no | Throws for a `var(--x)` with no declaration; skipped when it or `renderHTML` is absent |
| `renderSVGComposition` | no | Resolves to a `PrimitiveConformanceSvgResult` with complete `<svg>` markup; skipped when absent |
| `nestForeignChild` | no | Returns the container with a child from a pack it does not own; skipped when absent |

The cases, one per example: the node validates alone and inside a composition; `react`, `text`, `markdown`, and `slack` render non-empty output; style collection does not throw; a container recurses through `scope` for a foreign child (its text and markdown must contain `CONFORMANCE_FOREIGN_MARKER`); `svg` dispatch does not throw and the height estimate is positive and finite; `renderHTML` wraps the body in a `<section>` with no validation errors and no script bytes; every `var(--x)` the CSS references is declared; every readable class in the markup has a selector in the CSS; the text and markdown envelopes carry the fixture title; the Slack envelope leads with a header block; and the SVG composition renders complete markup.

## Where the code is

Imports flow one direction: `composition/` → `define/` → `pack/` → `validate/` → `render/`. `author/` and `testing/` may import any stage; stages must not import fronts. `check:module-graph` walks the built output to enforce it.

| Stage | Owns |
| --- | --- |
| `composition/` | Wire types, color tables, `ValidationError`, `CompositionValidationError` |
| `define/` | `definePrimitive`, `Frame`, `SurfaceMap`, Slack payload types, zod helpers |
| `pack/` | `definePrimitivePack`, `composePacks`, capabilities, `EnhancementDefinition` |
| `validate/` | Composition schema and identity cache, validator, parser, URL trust, JSON Schema |
| `render/` | Dispatcher, envelopes, HTML/text/markdown/Slack, `formatDisplayValue` |

Stage barrels and entry barrels are both hand-maintained, because the selection is the point. A subpath gets a file in `src/entries/` when its public surface spans more than one module or needs a package-level name: `.` draws from every core stage, each surface entry combines the shared envelope contract with that surface's formatter, and `./react` holds composition-level React helpers and dispatcher context. `./author` and `./testing` are single-module surfaces and point straight at their barrel.

| Concern | Path |
| --- | --- |
| Wire types | `src/composition/` |
| Slack payload types | `src/define/slack_blocks.ts`, `src/define/slack_assets.ts` |
| Primitive contract | `src/define/primitive_module.ts` |
| Frame contract | `src/define/frame.ts` |
| Pack contract | `src/pack/primitive_pack.ts` |
| Pack composition | `src/pack/compose.ts` |
| Dispatcher | `src/render/primitive_dispatch.ts` |
| Composition schema | `src/validate/composition_schema.ts` |
| Validation and parsing | `src/validate/validation.ts` |
| JSON Schema projection | `src/validate/json_schema.ts`, `src/validate/authoring_schema.ts` |
| URL policy | `src/validate/url.ts` |
| HTML renderer and style-adapter contract | `src/render/html/envelope.ts` |
| Distillate HTML style adapter | `src/render/html/distillate_style_adapter.ts` |
| Envelopes | `src/render/<surface>/envelope.ts` |
| Enhancements | `src/render/html/enhancements.ts` |
| Authoring front ends | `src/author/` |
| Entry barrels | `src/entries/` |
