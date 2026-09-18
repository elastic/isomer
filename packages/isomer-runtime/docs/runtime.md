# Runtime

A runtime is the assembled machine. A [pack](packs.md) is a vocabulary and a [frame](frame.md) is a document; the runtime is what turns them into something a host can call — one dispatcher, one validator, one parser, a view registry, and one [surface](surfaces.md) per output format, all agreeing on the same inventory.

```ts
const runtime = createIsomerRuntime({
  packs: [componentsPack, chartsPack],
  frames: { card: cardFrame },
  styleAdapter: htmlStyleAdapter,
});
```

Build one per process, at module scope. It is a plain object with no lifecycle and nothing to dispose. `packs` is required.

## Options

| Option | Cardinality | Decides |
| --- | --- | --- |
| `packs` | one or more | The vocabulary — which node types exist. **Additive**: packs compose. |
| `frames` | a named map | Which documents the `svg` surface can draw. **Exclusive**: one per render. |
| `defaultFrame` | one name | The frame a render that names none gets. Required past one frame. |
| `views` | any number | Views pre-registered on the runtime's view registry. |
| `rendererOverrides` | per type, per surface | One renderer replaced without forking a pack. |
| `styleAdapter` | at most one | The HTML surface's CSS and class-name strategy. Defaults to the packs' own adapters, combined. Required when any pack declares `collectStyles` and no pack (or this option) supplies an adapter. |
| `defaultAriaLabel` | one string | Fallback `aria-label` when the composition has neither `meta.ariaLabel` nor a `title`. Defaults to `'View'`. |
| `authoring` | optional | Options for the authoring JSON Schema `getAuthoringContext` returns. |

A runtime is homogeneous in its theme. `TTheme` resolves from the packs — each declares the palette its `svg` renderers read — and every frame in the map must supply it, so a mismatch is a compile error rather than a render-time failure. Packs wanting different palettes belong in different runtimes; see [Frame](frame.md).

`styleAdapter` is the runtime's only CSS seam, and a host normally omits it. A pack ships its own adapter, and the runtime combines the adapters of every pack it loads — each handle is routed to the adapter that owns it, and each pack's `collectStyles` hooks run only against its own pack's adapter, so loading two styled packs yields both stylesheets rather than a choice or a merge. `styleAdapter` replaces all of them at once, which is how a host supplies a no-op for a pack whose CSS it does not want; see [Surfaces](surfaces.md).

Combining needs each adapter to answer `ownsHandle`. Two pack adapters where one cannot throws `AMBIGUOUS_STYLE_ADAPTER`, naming the pack to fix. A CSS-bearing pack (any primitive declaring `collectStyles`) with no adapter from either side also throws — the silent drop is the likelier footgun.

A `collectStyles` hook mutates whatever collector the serving adapter created, and the runtime erases that type, so a pack written against a different engine composes cleanly and corrupts the collector at render. `styleCollector` on the pack and on the adapter names the shape each expects; a mismatch throws `INCOMPATIBLE_STYLE_COLLECTOR`, naming the pack, the primitive, and both collectors. Which adapters a pack must agree with follows the routing below: its own if it declares one, every adapter in the composite if it does not. Omitting the tag on either side opts out.

## Typing the render context

The factory has three type parameters: `THostContext` is what a view's `build` receives, `TRenderContext` is what a pack's `react` renderers receive, and `TTheme` is the palette. `TTheme` is inferred from `packs`. `TRenderContext` is inferred from `styleAdapter` alone, so a host that supplies none gets the SDK's `PrimitiveRenderContext` even when a pack narrows its context, as the slides pack does with `SlideRenderContext`. `react.render`'s `context` is then typed too wide to carry the pack's fields. Naming all three parameters positionally fixes the binding:

```ts
import {
  type SlideFrameTheme,
  type SlideRenderContext,
  slideDeckFrame,
  slidesPack,
} from '@elastic/isomer-primitives-slides';

const runtime = createIsomerRuntime<unknown, SlideRenderContext, SlideFrameTheme>({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

runtime.surfaces.react.render(composition, { context: { resolveClassName } });
```

`unknown` in the first position keeps the host context unconstrained; pass the type views build with instead when the runtime registers views. Omitting the positional form is fine for a runtime that never passes a narrowed `context` to `react.render`.

## What it returns

| Member | What it is |
| --- | --- |
| `packs` | The packs supplied, with renderer overrides applied |
| `primitives` | Every pack's definitions, flattened — the dispatcher's inventory |
| `surfaces` | `{ react, html, text, markdown, slack, svg }` — `svg` is `undefined` without `frames`, and typed present with them |
| `viewRegistry` | Register, list, get, and request registered views |
| `validate(composition)` | Schema plus semantic passes; returns errors and warnings |
| `parse(value)` | Schema only, for untrusted input; returns a composition or errors |
| `getAuthoringContext()` | Authoring schema, catalog, and live view summaries for an agent |
| `getCapabilities()` | The primitive types, formats, and enhancements this host supports |
| `getCompositionSchema()` | The same schema `validate` / `parse` use internally |

## What it refuses, and when

Composition errors throw from `createIsomerRuntime` at host startup, with the offending name in the message. A host boots or it does not; nothing waits for the first unlucky render.

| Rule | Message |
| --- | --- |
| At least one pack | `at least one primitive pack is required` |
| No node type owned by two packs | `primitive type "table" registered by "components" and "charts"` |
| No enhancement id owned by two packs | `enhancement "tableSort" registered by "components" and "charts"` |
| An override names a registered type | `renderer override targets unregistered primitive type "…"` |
| An override names a real surface key | `renderer override for "table" targets unknown surface "…"` |
| `defaultFrame` is one the runtime holds | `defaultFrame "…" is not one of the supplied frames (…)` |
| Two or more frames name a default | `2 frames supplied (…), so defaultFrame is required` |
| A CSS-bearing pack has a `styleAdapter` | `pack "…" primitive "…" declares collectStyles but no styleAdapter was supplied` |
| Every pack `styleAdapter` can route its own handles | `packs … each declare a styleAdapter, but … declares no ownsHandle` |
| Every CSS-bearing pack's `styleCollector` matches its adapter's | `pack "…" primitive "…" collects styles into a "…" collector, but … creates a "…" one` |

Duplicate types and enhancement ids are the SDK's `composePacks` rule, and it names every offender rather than failing on the first, so a bad three-pack composition reports all three at once.

## Construction order

The order is load-bearing in three places.

The runtime's own admission runs first, against the packs exactly as the host passed them: at least one pack, and an adapter for any pack that collects styles. Renderer overrides are merged next, and they replace `renderers` only — never `collectStyles` — so the pre-override inventory gives the same CSS-bearing answer as the post-override one.

The overridden packs then go through the SDK's `composePacks`, which rejects duplicate node types and enhancement ids and returns the one flattened inventory every consumer shares. The SDK's validator and parser memoize on that array's identity, so the dispatcher, the validator, the parser, the authoring context, and every surface see the same overridden definitions and no consumer recomposes the discriminated union.

Two runtime-wide facts are gathered as unions across packs while this happens: which node types are pictures rather than text (so Slack uploads a chart instead of approximating it in markdown), and whether any frame sizes itself by summing node heights (which is what makes a missing `metrics.svgHeight` worth warning about).

## Next

[Packs](packs.md) · [Frame](frame.md) · [Surfaces](surfaces.md) · [API reference](api.md)
