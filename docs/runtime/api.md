# API reference

Everything `@elastic/isomer-runtime` exports from its single entry point, plus what a host has to import from elsewhere.

## Functions

| Export | Signature |
| --- | --- |
| `createIsomerRuntime` | `(options: IsomerRuntimeOptions<THostContext, TRenderContext, TTheme>) => IsomerRuntime<THostContext, TRenderContext, TTheme>` — with `frames`, the result's `surfaces.svg` is `SvgSurface`; without, `undefined` |
| `defineView` | `(options: DefineViewOptions<THostContext, TInput, TNode>) => RegisteredView<…>` — defaults `description`; a Zod `input` types `build` |

## `IsomerRuntimeOptions`

| Field | Type | Notes |
| --- | --- | --- |
| `packs` | `readonly PrimitivePack<TTheme>[]` | Required. At least one; additive within one theme bound. |
| `frames` | `FrameMap<TTheme>` | Optional. Omit and `surfaces.svg` is `undefined`; an empty map throws `EMPTY_FRAMES`. |
| `defaultFrame` | `string` | Required when `frames` has more than one entry. |
| `views` | `readonly RegisteredView[]` | Pre-registered on the runtime's view registry. |
| `rendererOverrides` | `RuntimeRendererOverrides` | Keyed by primitive `type`, then by surface. |
| `styleAdapter` | `HTMLStyleAdapter<…>` | Replaces every pack's adapter. Defaults to the packs' own, combined. Required when any pack declares `collectStyles` and no adapter is otherwise available. |
| `defaultAriaLabel` | `string` | Fallback `aria-label` for `html` and for `react` with `wrapper`. Defaults to `'View'`. |
| `authoring` | `AuthoringJsonSchemaOptions` | Options for the authoring JSON Schema `getAuthoringContext` returns. |
| `inputBudget` | `InputBudget` | Limits `checkInputBudget` applies in `parse`, `validate`, the `html`, `text`, `markdown`, `slack`, and `svg` surfaces, and `viewRegistry.request` input; `react` does not validate, so it is not checked. |

`CreateIsomerRuntime` is the factory's overloaded signature: `frames` present types `surfaces.svg` as `SvgSurface`, `frames` absent types it `undefined`, and options not statically known get the union. `TRenderContext` is inferred from `styleAdapter` alone; a host that supplies none and loads a pack that narrows its context names all three type parameters positionally, as [Runtime](runtime.md#typing-the-render-context) shows.

## `IsomerRuntime`

| Member | Type |
| --- | --- |
| `packs` | `readonly PrimitivePack<TTheme>[]` — post-override |
| `primitives` | `readonly AnyPrimitiveDefinition[]` |
| `surfaces` | `RuntimeSurfaces<TRenderContext, TSvg>` |
| `viewRegistry` | `ViewRegistry<THostContext, PrimitiveNode>` |
| `getAuthoringContext()` | `RuntimeAuthoringContext` |
| `getCapabilities()` | `HostCapabilities` |
| `validate(composition)` | `CheckedValidationResult` |
| `parse(value)` | `ParsedComposition` |
| `getCompositionSchema()` | `ZodObject` |

## Surfaces

Each exposes `render` and `renderNode`, plus a `validating` field stating its posture.

| Surface | `render` returns | `renderNode` returns | `validating` | `renderNode` takes |
| --- | --- | --- | --- | --- |
| `react` | `ReactNode` | `ReactNode` | `false` | `ReactRenderNodeOptions`: `context`, `wrapper`, `enhancements` |
| `html` | `HTMLRenderResult` | `HTMLRenderResult` | `true` | `HTMLRenderOptions` |
| `text` | `string` | `string` | `true` | `TextRenderNodeOptions`: `onValidationError` |
| `markdown` | `string` | `string` | `true` | `MarkdownRenderNodeOptions`: `onValidationError` |
| `slack` | `SlackRenderResult` | `SlackRenderResult` | `true` | `SlackRenderNodeOptions`: `text`, `collectAssets`, `assetPrefix`, `onValidationError` |
| `svg` | `SvgRenderResult` | `SvgRenderResult` | `true` | `SvgRenderNodeOptions`: `frame`, `theme`, `anchors`, `onValidationError` |

Each surface's type is exported under its own name: `ReactSurface`, `HtmlSurface`, `TextSurface`, `MarkdownSurface`, `SlackSurface`, `SvgSurface`; `RuntimeSurfaces` is the record of all six. `render` takes its surface's options type below. `SvgRenderResult` is `{ element, css, width, height }`. The `svg` surface additionally exposes `renderPages(compositions, options?)`, which lays several compositions out as one document and returns `SvgPagesResult`, `{ pages, css, width, height }`: one root per composition against one stylesheet, every page the tallest estimate unless `height` is given, and the first composition's `theme` unless `theme` is given.

### Options types

| Type | Fields |
| --- | --- |
| `ReactRenderOptions` | `context`, `heading`, `wrapper: boolean \| CompositionWrapperOptions`, `enhancements: readonly string[]` (ids, resolved against the packs' enhancements as on `html`); `ReactRenderArgs` is the tuple form, optional only when `context` is |
| `ReactRenderNodeOptions` | `ReactRenderOptions` without `heading` |
| `HTMLRenderOptions` | `theme`, `scheme: 'light' \| 'dark'` (resolves `light-dark(…)` in the stylesheet; the `svg` surface sets it), `minify`, `fluid`, `framed`, `heading`, `css: 'inline' \| 'separate'`, `scripts: 'embedded' \| 'host'`, `enhancements: string[]`, `anchors: boolean` (node anchors; `true` for tests), `onValidationError` |
| `TextRenderOptions` | `heading`, `onValidationError` |
| `TextRenderNodeOptions` | `onValidationError` |
| `MarkdownRenderOptions` | `heading`, `onValidationError` |
| `MarkdownRenderNodeOptions` | `onValidationError` |
| `SlackRenderOptions` | `heading`, `text`, `collectAssets`, `assetPrefix`, `onValidationError` |
| `SlackRenderNodeOptions` | `SlackRenderOptions` without `heading` |
| `SvgRenderOptions` | `frame`, `width`, `height`, `theme`, `anchors: boolean` (node anchors, e.g. for `checkLayout`), `onValidationError` |

`onValidationError` is `'collect' | 'throw'`. `html` defaults to `'collect'` and reports on `validationErrors`; `text`, `markdown`, `slack`, and `svg` default to `'throw'`. Each validating surface's `renderNode` validates the node as a one-node view and takes the same default as its `render`. Input [refused before parsing](../sdk/composition.md#the-input-budget) throws on every surface in either mode.

### Result types

| Type | Shape |
| --- | --- |
| `HTMLRenderResult` | `{ html, css, js, body, measurement, validationErrors }` |
| `SlackRenderResult` | `{ text, blocks, assets }` |
| `ValidationResult` | `{ valid, errors, warnings }` — each error is a `ValidationError`, `{ path, message, nodeType?, code? }`, where `code` (`INPUT_OVER_BUDGET` or `INPUT_NOT_PLAIN_DATA`) marks input refused before parsing |
| `CheckedValidationResult` | `ValidationResult` plus `composition`, the plain copy validation checked, which validating surfaces render; `undefined` only when refused before parsing |
| `ParsedComposition` | `{ valid, errors, composition? }` |

Three results carry a `composition`, each with its own rule:

| Result | `composition` |
| --- | --- |
| `ParsedComposition` | The parsed document, present only when `valid` |
| `CheckedValidationResult` | The checked copy, present even when `valid` is `false`; `undefined` only when the input budget refused the input |
| `ViewResponse` | The checked copy, or the built value, unchecked, when the input budget refused it; always present |

## View registry

| Member | Type |
| --- | --- |
| `register(view)` | `void` — throws on a duplicate id |
| `list()` | `RegisteredViewSummary[]` |
| `get(id)` | `RegisteredViewSummary \| undefined` |
| `request(id, context, input?)` | `Promise<ViewResponse>` — `{ view, composition, validation }` |

`RegisteredView` is `{ id, title, description, answers, input?, build }`, where `build({ context, input })` returns the composition. `DefineViewOptions` is the same with `description` optional. `RegisteredViewSummary` is `{ id, title, description, answers, inputSchema? }`. `ViewBuildArgs` is `build`'s argument, `ViewInput` is `Record<string, unknown>`, `build`'s input type unless a Zod `input` schema infers one, and `ViewResponse` is what `request` resolves to.

## Types exported from this package

| Concern | Names |
| --- | --- |
| Runtime | `CreateIsomerRuntime`, `IsomerRuntime`, `IsomerRuntimeOptions`, `RuntimeSurfaces`, `FrameMap`, `RuntimeRendererOverrides` |
| Authoring | `RuntimeAuthoringContext`, `PrimitiveDescriptions`, `HostCapabilities`, `JsonSchema` |
| View registry | `ViewRegistry`, `RegisteredView`, `RegisteredViewSummary`, `DefineViewOptions`, `ViewBuildArgs`, `ViewInput`, `ViewResponse`, `RegisteredViewInputError` |
| Surfaces | `ReactSurface`, `HtmlSurface`, `TextSurface`, `MarkdownSurface`, `SlackSurface`, `SvgSurface` |
| Options | `ReactRenderOptions`, `ReactRenderNodeOptions`, `ReactRenderArgs`, `HTMLRenderOptions`, `HTMLStyleAdapter`, `TextRenderOptions`, `TextRenderNodeOptions`, `MarkdownRenderOptions`, `MarkdownRenderNodeOptions`, `SlackRenderOptions`, `SlackRenderNodeOptions`, `SvgRenderOptions`, `SvgRenderNodeOptions` |
| Results | `HTMLRenderResult`, `SlackRenderResult`, `SvgRenderResult` |
| Errors | `IsomerError`, `IsomerErrorCode`, `ISOMER_ERROR_CODES`, `CompositionValidationError` |

`src/api_reference.test.ts` fails when a name exported from `src/index.ts` is missing from this page.

`IsomerError` and `CompositionValidationError` are deliberate pass-throughs of the SDK catch contract: a host catching a runtime construction failure or a validating surface's refusal should not need a second dependency just to name `code`. Neither is identified by `instanceof`: `IsomerError` by `name` and `code`, `CompositionValidationError` by `name`, `code`, and `errors`.

## Import from the SDK

`PrimitiveNode`, `Composition`, `CheckedValidationResult`, `ValidationResult`, `ValidationWarning`, `warningsForSurface`, `definePrimitive`, `describeCapabilities`, `PrimitivePack`, `Frame`.

## Errors

| Thrown | By | Carries |
| --- | --- | --- |
| `IsomerError` | `createIsomerRuntime` (`EMPTY_PACKS`, `DUPLICATE_PACK_ID`, `DUPLICATE_PRIMITIVE_TYPE`, `DUPLICATE_ENHANCEMENT`, `UNKNOWN_PRIMITIVE_TYPE`, `UNKNOWN_SURFACE`, `EMPTY_FRAMES`, `UNKNOWN_FRAME`, `AMBIGUOUS_FRAME`, `MISSING_STYLE_ADAPTER`, `AMBIGUOUS_STYLE_ADAPTER`, `INCOMPATIBLE_STYLE_COLLECTOR`; see [Runtime](runtime.md#what-it-refuses-and-when)), `viewRegistry.register` on a repeated id (`DUPLICATE_VIEW`), `viewRegistry.request` on an unknown id (`UNKNOWN_VIEW`), `getAuthoringContext().schemaFor` or `describePrimitives` on an unknown type (`UNKNOWN_PRIMITIVE_TYPE`), or the `svg` surface on an unknown frame name (`UNKNOWN_FRAME`), a body the frame rejects (`INVALID_FRAME_BODY`), or `renderPages` on an empty list (`EMPTY_PAGES`) | `code` and a message naming the offender |
| `RegisteredViewInputError` | `viewRegistry.request`, on input refused before parsing or invalid against the view's schema | `code` (`VIEW_INPUT_INVALID`), `viewId`, `errors` (`{ path, message, nodeType?, code? }` each) |
| `CompositionValidationError` | `render` and `renderNode` on `text`, `markdown`, `slack`, and `svg` by default; on `html` with `onValidationError: 'throw'`; on every validating surface on input refused before parsing | `code` (`COMPOSITION_INVALID`), `errors` |

## Where the code is

| Concern | File |
| --- | --- |
| Factory, options, pack admission, frame resolution | `src/assemble/runtime.ts` |
| Renderer overrides and their checks | `src/assemble/overrides.ts` |
| Authoring context | `src/assemble/authoring.ts` |
| Surfaces, one file each behind a barrel | `src/surfaces/` |
| View registry, `defineView`, input error | `src/registry/view_registry.ts` |
| Public entry point | `src/index.ts` |
| Style-adapter composition | `src/assemble/style_adapter.ts` |
| Coverage of this page against the entry point | `src/api_reference.test.ts` |
| Composition and render behaviour | `src/assemble/runtime.test.ts` |
| Registry behaviour | `src/registry/view_registry.test.ts` |
