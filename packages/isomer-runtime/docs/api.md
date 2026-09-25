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
| `frames` | `FrameMap<TTheme>` | Optional. Omit and `surfaces.svg` is `undefined`. |
| `defaultFrame` | `string` | Required when `frames` has more than one entry. |
| `views` | `readonly RegisteredView[]` | Pre-registered on the runtime's view registry. |
| `rendererOverrides` | `RuntimeRendererOverrides` | Keyed by primitive `type`, then by surface. |
| `styleAdapter` | `HTMLStyleAdapter<…>` | Replaces every pack's adapter. Defaults to the packs' own, combined. Required when any pack declares `collectStyles` and no adapter is otherwise available. |
| `defaultAriaLabel` | `string` | Fallback `aria-label` for `html` and for `react` with `wrapper`. Defaults to `'View'`. |
| `authoring` | `AuthoringJsonSchemaOptions` | Options for the authoring JSON Schema `getAuthoringContext` returns. |

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
| `validate(composition)` | `ValidationResult` |
| `parse(value)` | `ParsedComposition` |
| `getCompositionSchema()` | `ZodObject` |

## Surfaces

Each exposes `render` and `renderNode`, plus a `validating` field stating its posture.

| Surface | `render` returns | `renderNode` returns | `validating` | `renderNode` takes |
| --- | --- | --- | --- | --- |
| `react` | `ReactNode` | `ReactNode` | `false` | `ReactRenderNodeOptions`: `context`, `wrapper` |
| `html` | `HTMLRenderResult` | `HTMLRenderResult` | `true` | `HTMLRenderOptions` |
| `text` | `string` | `string` | `true` | nothing |
| `markdown` | `string` | `string` | `true` | nothing |
| `slack` | `SlackRenderResult` | `SlackRenderResult` | `true` | `SlackRenderNodeOptions`: `text`, `collectAssets`, `assetPrefix` |
| `svg` | `SvgRenderResult` | `SvgRenderResult` | `true` | `SvgRenderNodeOptions`: `frame`, `theme` |

Each surface's type is exported under its own name: `ReactSurface`, `HtmlSurface`, `TextSurface`, `MarkdownSurface`, `SlackSurface`, `SvgSurface`; `RuntimeSurfaces` is the record of all six. `render` takes its surface's options type below. `SvgRenderResult` is `{ element, css, width, height }`. The `svg` surface additionally exposes `resolveViewport(composition, options?): { width, height }`, which takes `frame`, `width`, and `height`.

### Options types

| Type | Fields |
| --- | --- |
| `ReactRenderOptions` | `context`, `heading`, `wrapper: boolean \| CompositionWrapperOptions`; `ReactRenderArgs` is the tuple form, optional only when `context` is |
| `ReactRenderNodeOptions` | `ReactRenderOptions` without `heading` |
| `HTMLRenderOptions` | `theme`, `minify`, `fluid`, `framed`, `heading`, `css: 'inline' \| 'separate'`, `enhancements: string[]`, `onValidationError` |
| `TextRenderOptions` | `onValidationError` |
| `MarkdownRenderOptions` | `onValidationError` |
| `SlackRenderOptions` | `text`, `collectAssets`, `assetPrefix`, `onValidationError` |
| `SlackRenderNodeOptions` | `SlackRenderOptions` without `onValidationError` |
| `SvgRenderOptions` | `frame`, `width`, `height`, `theme`, `onValidationError` |

`onValidationError` is `'collect' | 'throw'`. `html` defaults to `'collect'` and reports on `validationErrors`; `text`, `markdown`, `slack`, and `svg` default to `'throw'`.

### Result types

| Type | Shape |
| --- | --- |
| `HTMLRenderResult` | `{ html, css, js, body, measurement, validationErrors }` |
| `SlackRenderResult` | `{ text, blocks, assets }` |
| `ValidationResult` | `{ valid, errors, warnings }` — each error is `{ path, message }` |
| `ParsedComposition` | `{ valid, errors, composition? }` |

## View registry

| Member | Type |
| --- | --- |
| `register(view)` | `void` — throws on a duplicate id |
| `list()` | `RegisteredViewSummary[]` |
| `get(id)` | `RegisteredViewSummary \| undefined` |
| `request(id, context, input?)` | `Promise<ViewResponse>` — `{ view, composition, validation }` |

`RegisteredView` is `{ id, title, description, answers, input?, build }`, where `build({ context, input })` returns the composition. `DefineViewOptions` is the same with `description` optional. `RegisteredViewSummary` is `{ id, title, description, answers, inputSchema? }`. `ViewBuildArgs` is `build`'s argument, `ViewInput` is the input shape a view's Zod schema infers, and `ViewResponse` is what `request` resolves to.

## Types exported from this package

| Concern | Names |
| --- | --- |
| Runtime | `CreateIsomerRuntime`, `IsomerRuntime`, `IsomerRuntimeOptions`, `RuntimeSurfaces`, `FrameMap`, `RuntimeRendererOverrides`, `RuntimePackTypes` |
| Authoring | `RuntimeAuthoringContext`, `HostCapabilities`, `JsonSchema` |
| View registry | `ViewRegistry`, `RegisteredView`, `RegisteredViewSummary`, `DefineViewOptions`, `ViewBuildArgs`, `ViewInput`, `ViewResponse`, `RegisteredViewInputError` |
| Surfaces | `ReactSurface`, `HtmlSurface`, `TextSurface`, `MarkdownSurface`, `SlackSurface`, `SvgSurface` |
| Options | `ReactRenderOptions`, `ReactRenderNodeOptions`, `ReactRenderArgs`, `HTMLRenderOptions`, `HTMLStyleAdapter`, `TextRenderOptions`, `MarkdownRenderOptions`, `SlackRenderOptions`, `SlackRenderNodeOptions`, `SvgRenderOptions`, `SvgRenderNodeOptions` |
| Results | `HTMLRenderResult`, `SlackRenderResult`, `SvgRenderResult` |
| Errors | `IsomerError`, `IsomerErrorCode`, `ISOMER_ERROR_CODES` |

`src/api_reference.test.ts` fails when a name exported from `src/index.ts` is missing from this page.

`IsomerError` is a deliberate pass-through of the SDK catch contract: a host catching a runtime construction failure should not need a second dependency just to name `code`.

## Import from the SDK

`PrimitiveNode`, `Composition`, `ValidationResult`, `ValidationWarning`, `warningsForSurface`, `definePrimitive`, `describeCapabilities`, `PrimitivePack`, `Frame`, `CompositionValidationError`.

## Errors

| Thrown | By | Carries |
| --- | --- | --- |
| `IsomerError` | `createIsomerRuntime`, `viewRegistry.register`, an unknown view id, `getAuthoringContext().schemaFor` on an unknown type (`UNKNOWN_PRIMITIVE_TYPE`), or the `svg` surface | `code` and a message naming the offender |
| `RegisteredViewInputError` | `viewRegistry.request`, on invalid input | `code` (`VIEW_INPUT_INVALID`), `viewId`, `errors` (`{ path, message }` each) |
| `CompositionValidationError` | `text`, `markdown`, `slack`, and `svg` by default; `html` with `onValidationError: 'throw'` | `code` (`COMPOSITION_INVALID`), `errors` |

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
