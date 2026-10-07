# API reference

What each entry point exports, and which ones cost you a dependency.

## Entry points

| Entry | Loads | Reach for it when |
| --- | --- | --- |
| `.` | zod, React, and the GFM parser and serializer (`mdast-util-from-markdown`, `micromark-extension-gfm`, `mdast-util-to-markdown`, `mdast-util-gfm`) | Defining primitives, packs, frames; validating |
| `./html` | React, `react-dom/server`, and the JavaScript parser `acorn` | Rendering HTML, writing a style adapter |
| `./text` | nothing | Text envelopes |
| `./markdown` | zod and the GFM parser and serializer | Markdown envelopes and formatting |
| `./slack` | zod and the GFM parser and serializer | Block Kit types, limits, asset collection |
| `./react` | React | React content helpers and dispatcher context |
| `./author` | React | JSX front end, agent prompts |
| `./testing` | Node built-ins (`assert`, `fs`, `path`, `url`) | Pack conformance harness |

## Root entry — contracts

| Export | What it is |
| --- | --- |
| `definePrimitive` | Builds a `PrimitiveDefinition`; adds `id` and `surfaces` to its schema and closes it to unknown keys |
| `definePrimitiveFor` | `definePrimitive` bound to one pack's `PackTypes` |
| `definePrimitivePack` | Builds a `PrimitivePack`; its type argument `TTheme` is the palette its frames must supply |
| `composePacks` | Flattens packs into one frozen inventory; rejects cross-pack duplicates |
| `bindFrame` | Erases a `Frame<TTheme>` into a `BoundFrame` |
| `describeCapabilities` | Reports primitives, formats, per-primitive support for each format, and enhancements for a set of packs |
| `unresolvedBodyNodeSchema` | The child slot in a container's standalone schema |
| `exampleNodes` | A definition's example nodes, named or bare |
| `primitiveExamples` | A definition's examples as `NormalizedPrimitiveExample`s, `{ name?, description?, node }` |

Types: `PrimitiveDefinition`, `AnyPrimitiveDefinition`, `PrimitiveExample` (a named entry of `examples`), `ExampleNode` (the node type an entry holds), `PrimitiveNode`, `PrimitiveSchema` (a `ZodObject`), `PrimitiveCatalogEntry`, `PrimitiveMetrics`, `PrimitiveChildRef`, `PrimitiveRenderContext`, `StyledRenderContext`, `PrimitiveStyleCollector`, `PrimitiveStyleCollectionContext`, `PackTypes`, `DefaultPackTypes`, `Renderer` (`(node, env)` — `env` is `SurfaceMap<T>[S]['env']`), `Renderers`, `RenderScope`, `ReactContextArg` (the dispatcher's optional-or-required context argument tuple for `renderReact`), `SurfaceMap`, `SurfaceName`, `OptionalSurface`, `PrimitivePack`, `AnyPrimitivePack`, `PrimitivePackInput`, `PackStyleAdapter`, `PackAuthoringOptions`, `PrimitiveGroup`, `ComposedPacks`, `Frame`, `FrameBody`, `BoundFrame`, `FrameDispatcher`, `FrameHeader`, `FrameComposition`, `FrameViewport`, `ThemePair`, `EnhancementDefinition`, `HostCapabilities`, `SurfaceSupport`, `StyleHandle`, `ThemeTokenPath`, `Composition`, `CompositionMeta` (its advisory `meta`), `BodyNodeBase`, `ActionEventRef`, `IsomerError`, `IsomerErrorCode`.

`react` and `svg` renderers receive `env.theme`: the frame's resolved palette (`T['theme']`) when reached through the `svg` surface, `undefined` outside one. A pack whose `svg` renderers read tokens still declares them as `definePrimitivePack<TTheme>`'s type argument. `PrimitivePackInput.authoring` (a `PackAuthoringOptions`) is this pack's own contribution — `describe` and `omitProperties` — to the runtime's merged authoring schema, plus `groups` for an index catalog.

## Root entry — dispatch

| Export | What it is |
| --- | --- |
| `createPrimitiveDispatcher` | Builds a `PrimitiveDispatcher` from a definition list; `PrimitiveDispatcherOptions` carries its `label` |
| `createChildNodeWalker` | Builds a `ChildNodeWalker`, which yields a `ChildNodeRef` (`{ node, path }`) per nested node across a heterogeneous inventory |
| `mapCompositionNodes` | `(composition, walk, fn)`: rebuilds a composition's body with `fn` applied to every node and every child `walk` yields, without recursion; a node nested in itself throws `CYCLIC_COMPOSITION` |
| `someBodyNode` | Predicate over a body, following children |
| `isVisibleOnSurface` | Surface-visibility check from a node's own `surfaces` hint |
| `nodeAnchor`, `NODE_ANCHOR_ATTRIBUTE` | Props a `react` renderer spreads on its root so its element can be found; empty unless the HTML surface, or outside it `context.anchors`, turns anchors on |
| `layoutRoom`, `LAYOUT_ROOM_ATTRIBUTE` | Props a renderer spreads on an element inside its node, such as a frame's body, so `checkLayout` measures the nodes nested in it against that element; rendered when `nodeAnchor` would be |
| `withNodeAnchors` | A view of a context with anchors on, as an enhancement declaring `anchors: true` turns them on |
| `withoutAnchors` | A context under which nothing renders an anchor, for content that is not one of a node's `children` |
| `checkLayout` | Where a measured render's nodes run past their room or onto a sibling, as `LayoutFinding`s over a `LayoutBox` tree of `LayoutRect`s |
| `BODY_NODE_SURFACES` | `['react','svg','text','markdown','slack']` |

## Root entry — composition and validation

| Export | What it is |
| --- | --- |
| `createCompositionValidator` | Trusted-input validator: the input budget, the schema, then semantic passes; returns `{ valid, errors, warnings, composition }`, where `composition` is the checked copy |
| `createCompositionParser` | Untrusted-input parser: the input budget, then the schema only |
| `checkInputBudget` | A plain copy of the input to parse in its place (`InputBudgetCheck`), or the refusal for input past `MAX_INPUT_DEPTH`, `MAX_INPUT_VALUES`, or `MAX_INPUT_CHARACTERS` (`INPUT_OVER_BUDGET`) or not plain data (`INPUT_NOT_PLAIN_DATA`); the validator and parser run it first |
| `isInputRefusal` | Whether a `ValidationError` is a `checkInputBudget` refusal, which no validation mode collects |
| `compositionToRender` | The validator's checked copy, which a validating render draws in place of its input; throws `CompositionValidationError` on `'throw'`, or in any mode on input refused by `checkInputBudget` |
| `IsomerError` | Construction and authoring failures, identified by `name` and `code`. Codes name the condition, not the throwing module. |
| `CompositionValidationError` | Invalid composition, identified by `name`, `code` (`COMPOSITION_INVALID`), and `errors` |
| `formatValidationError` | A `ValidationError` as one `<path> (in <nodeType>) <message>` string |
| `warningsForSurface` | Narrows warnings to one surface |
| `getCompositionSchemaForDefinitions` | Memoized schema, keyed on array identity |
| `buildCompositionJsonSchema` | Draft-2020-12 projection for hosts that validate outside TypeScript |
| `buildAuthoringJsonSchema` | Agent-facing projection: named shared defs, inlined scalars, no `id`/`surfaces` |
| `authoringSchemaSubset` | The `$defs` some types reach in an authoring schema, with the body-node union stubbed |
| `formatZodIssues` | Zod issues as `ValidationError`s |

Types: `ValidationError`, `ValidationResult`, `CheckedValidationResult` (`ValidationResult` plus `composition`), `CheckedComposition`, `ValidationWarning`, `ValidationErrorMode`, `CompositionValidatorOptions`, `InputBudget`, `InputBudgetCheck`, `ParsedComposition` (`{ valid, errors, composition? }`), `CompositionSchemaOptions`, `CompositionJsonSchemaOptions`, `AuthoringJsonSchemaOptions`, `IsomerErrorCode`.

## Root entry — values, URLs, helpers

`assetUrl` and `navigationHref` (each taking `UrlSchemaOptions`, an optional `max` length), `sanitizeAssetUrl`, `sanitizeNavigationHref`, `ASSET_URL_RULE`, `NAVIGATION_HREF_RULE`, `ASSET_URL_MESSAGE`, `NAVIGATION_HREF_MESSAGE`, `BLOCKED_HREF` — see [URL trust](url-trust.md).

`displayValueSchema`, `structuredValueSchema`, `namedColorSchema`, `renderThemeSchema`, `formatDisplayValue` (with `FormatDisplayValueOptions`), `isStructuredValue`, `rawDisplayValue`, `STRUCTURED_VALUE_FORMATS`, `ALL_NAMED_COLORS`, `ISOMER_ERROR_CODES`. `PayloadMeasurement` is the byte breakdown on `HTMLRenderResult.measurement`.

`scopeScript` wraps one script body in its own function, for anything that joins bodies, such as a runtime combining several packs' `getScriptText`. It lives here rather than on `./html` because it needs no server renderer. See [Enhancements](rendering.md#enhancements).

Value types: `DisplayValue`, `StructuredValue`, `StructuredValueFormat`, `NamedColor`, `NamedColorPalette`, `RenderTheme` (`'light' | 'dark' | 'auto'`).

Zod helpers so a pack states constraints the same way everywhere: `z` and `requiredString`. Zod 4's `z.number()` already rejects `NaN` and both infinities, and an enum's error is worded centrally.

## `./html`

`renderHTMLWithDispatcher` and the types a style adapter is written against: `HTMLStyleAdapter`, `HTMLRenderOptions`, `HTMLRenderResult`, `HTMLRenderDispatcher`, `HTMLDispatcherRenderOptions`, `HTMLEnhancementScope`, `EnhancementDefinition`, `ReactContentDispatcher`, `ReactContentOptions`. `HTMLRenderOptions.enhancements` is a list of enhancement ids; the render keeps the first definition of each that applies to the body and emits its script once, in its own function scope. `HTMLRenderOptions.anchors` turns anchors on directly, for tests. `HTMLRenderOptions.scheme` resolves the stylesheet's `light-dark(…)` to one scheme, as the `svg` surface asks for.

## `./react`

`renderCompositionContent`, `wrapCompositionContent` (the `.isomer[.framed][.fluid]` `section` the `html` surface's wrapper also emits, for a React-only host; `CompositionWrapperOptions` carries `framed`, `fluid`, `theme`, `defaultAriaLabel`), `applyEnhancements` (the enhancement definitions that apply to a body, the first of each id and limited to `requested` ids when given, as the `html` surface resolves them, and a view of the render context carrying their ids as `enhancements`, with `anchors` on when one asks), and the dispatcher/context types used by React renderers: `ReactContentDispatcher`, `ReactContentOptions`.

The browser-side helpers, exported here rather than from the root entry: `runEnhancementScript` takes a `scripts: 'host'` render's `js` and the `.isomer` section the host inserted, and runs the one against the other; `findNodeElementPairs` lists each `react`-visible node of a body, in pre-order, with its anchored element under a DOM root; `measureDom` returns the `LayoutBox` tree a browser laid an element out as, for `checkLayout`.

## `./text`, `./markdown`, `./slack`

`./text` — `renderTextEnvelope` with `TextEnvelopeOptions`, and `TextEnvelopeDispatcher`. Text formatting is pack-owned; the SDK ships no house style.

`./markdown` — `renderMarkdownEnvelope` with `MarkdownEnvelopeOptions`, `MarkdownEnvelopeDispatcher`, the `md` builder with `MarkdownBlock`, `MarkdownInline`, `MarkdownInlineInput`, and `MarkdownContent`, and `serializeMarkdown`.

`./slack` — `renderSlackEnvelope` with `SlackEnvelopeOptions` and `SlackEnvelopeResult`, `SlackEnvelopeDispatcher`, `SLACK_LIMITS`, `createSlackAssetCollector` (`{ prefix? }`), `SlackAssetCollector`, `SlackAssetRequest`, `SlackFileReference`, `isSlackReachableImageUrl`.

Block Kit types: `SlackBlock` and its variants `SlackHeaderBlock` (`SlackHeaderLevel`), `SlackSectionBlock` (`SlackSectionAccessory`), `SlackContextBlock`, `SlackDividerBlock`, `SlackImageBlock`, `SlackVideoBlock`, `SlackActionsBlock` (`SlackActionElement`), `SlackTableBlock` (`SlackTableCell`, `SlackTableColumnSetting`, `SlackRawTextElement`), `SlackRichTextBlock` (`SlackRichTextBlockElement`, `SlackRichTextSection`, `SlackRichTextList`, `SlackRichTextPreformatted`, `SlackRichTextQuote`, `SlackRichTextInline`, `SlackRichTextText`, `SlackRichTextLink`, `SlackRichTextTag`, `SlackRichTextStyle`, `SlackTagColor`); text objects `SlackTextObject`, `SlackPlainTextObject`, `SlackMrkdwnTextObject`; elements `SlackButtonElement`, `SlackImageElement`, `SlackStaticSelectElement`, `SlackMultiStaticSelectElement`, `SlackOverflowElement`, `SlackRadioButtonsElement`, `SlackCheckboxesElement`, `SlackOptionObject`, `SlackOptionGroup`.

mrkdwn formatters: `escapeMrkdwn`, `bold`, `italic`, `strike`, `code`, `codeBlock`, `link`, `slackLinkUrl` (the URL `link` would link, or `null`), `clampSlackText`, and `markdownContentToSlackBlocks` for content built with `md`; wrap GFM a host already has in `md.authored` to translate it.

The root, `./markdown`, and `./slack` load the GFM parser for authored Markdown sanitization.

## `./author`

JSX: `fromChildren`, `fromTextChildren`, `AuthoredChildBrand`, `AuthoredToItemBrand` (on a `toItem` field, whose item brands the shim leaves alone), `AuthoredTextBrand`, `AuthorChildContext`, `readAuthoredSpec` (a schema's branded fields as an `AuthoredSpec` of `AuthoredChildField`s and `AuthoredTextField`s), `AuthorComponent`, `buildJsxShim`, `JsxShim`, `PrimitiveComponentMap`, `CompositionAuthorProps`, `AuthorComposition`, `textFromChildren`.

Agent prompts: `buildAuthoringPrompt` (`AuthoringPromptContext`), `formatPrimitiveEntry` (one full catalog bullet), `AUTHORING_PROFILE_IDS` (`AuthoringProfileId`), `AuthoringViewSummary`. `WithNodeFields` is on the root entry, next to `definePrimitive`.

## `./testing`

`runPrimitiveInventoryConformance` checks the inventory itself: every definition has an example, example names are non-empty and unique within a definition, each example's `type` matches, and `catalog.example` parses or matches a published example. `primitiveConformanceRows` crosses every definition's examples (`PrimitiveConformanceExample`, whose `exampleName` is set for a named one) with the cases (`PrimitiveConformanceCase`) for `it.each`. `CONFORMANCE_FOREIGN_MARKER` is the string a container's `nestForeignChild` case checks for. `assertPackRegistrationComplete` (`PackRegistrationOptions`) separately checks that every directory under a pack's `src/primitives/` is registered.

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
| `renderSvg`, `estimateSvgHeight` | no | Skipped when absent. `sizesFromNodeHeights: false` skips the height case for a fixed-size frame |
| `renderHTML` | no | Honors `PrimitiveConformanceHtmlOptions` (`css`, `names`, `anchors`); skipped when absent |
| `anchorWalk` | no | The child walker over every definition rendered with; set it once every `react` renderer spreads `nodeAnchor`, to turn on the anchor case |
| `assertVarRefsHaveDeclarations` | no | Throws for a `var(--x)` with no declaration; skipped when it or `renderHTML` is absent |
| `renderSVGComposition` | no | Resolves to a `PrimitiveConformanceSvgResult` with complete `<svg>` markup; skipped when absent |
| `nestForeignChild` | no | Returns the container with a child from a pack it does not own; skipped when absent |

The cases, one per example: the node validates alone and inside a composition; `react`, `text`, `markdown`, and `slack` render non-empty output; style collection does not throw; a container recurses through `scope` for a foreign child (its text and markdown must contain `CONFORMANCE_FOREIGN_MARKER`); `svg` dispatch does not throw and the height estimate is positive and finite; `renderHTML` wraps the body in a `<section>` with no validation errors and no script bytes; it renders no node anchors unless asked, and, with `anchorWalk` set, one anchor per node when asked; every `var(--x)` the CSS references is declared; every readable class in the markup has a selector in the CSS; the text and markdown envelopes carry the fixture title; the Slack envelope leads with a header block; and the SVG composition renders complete markup.

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
| Envelopes | `src/render/<surface>/envelope.ts` |
| Enhancements | `src/render/html/enhancements.ts` |
| Authoring front ends | `src/author/` |
| Entry barrels | `src/entries/` |
