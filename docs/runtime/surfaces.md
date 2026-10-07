# Surfaces

A surface is one way the runtime renders. Every surface takes the same `Composition` and exposes the same two methods — `render` for a whole composition, `renderNode` for a single node — so a host picks a surface by the channel it is answering into, not by what the composition contains. Five surfaces produce a format a host ships as is; the sixth, `snapshot`, produces what a rasterizer turns into PNG, SVG, or PDF ([Surfaces and formats](#surfaces-and-formats)).

```ts
runtime.surfaces.text.render(composition);
runtime.surfaces.slack.render(composition, { collectAssets: true });
```

## The six

| Surface | `render` returns | Validates | Options |
| --- | --- | --- | --- |
| `react` | `ReactNode` | no | `context` (required only if the pack narrows it), `heading`, `wrapper`, `enhancements` (ids) |
| `html` | `HTMLRenderResult` | yes | `theme`, `scheme`, `fluid`, `framed`, `heading`, `css`, `scripts`, `minify`, `enhancements` (ids), `anchors`, `onValidationError` |
| `text` | `string` | yes | `heading`, `onValidationError` |
| `markdown` | `string` | yes | `heading`, `onValidationError` |
| `slack` | `{ text, blocks, assets }` | yes | `heading`, `text`, `collectAssets`, `assetPrefix`, `onValidationError` |
| `snapshot` | `SnapshotRenderResult` | yes | `frame`, `width`, `height`, `theme`, `anchors`, `onValidationError` |

`HTMLRenderResult` is `{ html, css, js, body, measurement, validationErrors }`. `scheme` resolves the stylesheet's `light-dark(…)` values to one scheme; a browser resolves them itself, so an `html` host rarely sets it, and the `snapshot` surface sets it for its own render. [Embedding](embedding.md) covers getting that markup, stylesheet, and script onto a page a host already controls, including when to render with `scripts: 'host'`. The `snapshot` entry is `undefined` unless the runtime was given [frames](frame.md), and the factory's return type tracks which.

All six are synchronous.

`heading` defaults to `true` wherever it appears: the composition's title and subtitle open the output, as an `h2` and `p.sub` on `react` and `html`, an `h1` and italic line in Markdown, an uppercased line in text, and a `header` and `context` block in Slack. Pass `false` when the host already shows the title, or the body opens with its own heading, as a slide does. Slack then leaves them out of its fallback `text` too, and `html` still uses the title for the wrapper's `aria-label`.

## Validation posture

Whether a surface validates is a declared field on its type — `readonly validating: true` or `false` — so a host can reason about it without reading implementations.

The HTML surface reports: the render proceeds and the findings come back as `validationErrors` on the result, because a partial document is still worth showing. The other four validating surfaces throw `CompositionValidationError` by default, because a string, a Slack payload, or an image has no place to carry findings and would otherwise go out as if it were sound. `onValidationError` flips either posture: `'throw'` on HTML, `'collect'` on the rest to validate and render anyway. One finding it cannot flip: input refused before parsing, over its [input budget](../sdk/composition.md#the-input-budget) or not plain data, throws on every validating surface, since nothing can render it.

A validating surface renders the plain copy its validation checked, never the value it was handed, so a getter or `Proxy` cannot pass validation with one value and render another. `renderNode` holds to the same contract: it validates the node as the sole node of a view, under the same input budget, takes `onValidationError` with the surface's `render` default, and renders the checked copy.

React is the exception, deliberately. It is the interactive target, where a partial render beats a thrown error and a host would rather show the parts of a composition that are well-formed. `surfaces.react.render` will render a composition that `runtime.validate` rejects. It renders the value it is given, reading it as it draws. A host that wants the other behaviour validates first and renders the result's `composition`.

## React returns content, not a document

The React surface emits an `h2` and a `p.sub` for the composition's title and subtitle, then the body nodes, inside a dispatcher context provider. The wrapper element, the `aria-label`, the `data-theme` attribute, and the stylesheet belong to the host — by default. Pass `wrapper` and `render`/`renderNode` wrap the content in the same `.isomer[.framed][.fluid]` `section` the `html` surface emits, with the same `aria-label` fallback and `data-theme`, instead of every React-only host reimplementing those class names:

```ts
runtime.surfaces.react.render(composition, { wrapper: true });
runtime.surfaces.react.render(composition, {
  context: { onEvent },
  wrapper: { fluid: true, theme: 'dark' },
});
```

Omit `wrapper` and the surface returns bare content.

Pass `enhancements` to render with a pack's enhancements, by id, exactly as on the `html` surface: ids resolve against the enhancements the runtime's packs register, and an id none registers is ignored. Those whose `appliesTo` finds something in the body reach every renderer as `context.enhancements`, and turn node anchors on when one declares `anchors: true`. Each one's `script` runs once against the `wrapper` section when it mounts, and a new composition or node object mounts a fresh section, so a script never runs twice on the same elements. A script needs `wrapper`; without one the surface warns once for that composition and runs nothing. An enhancement the host drives, with no `script`, needs no wrapper: the host finds the parts it acts on with `findNodeElementPairs` after the render commits.

`renderNode` takes `ReactRenderNodeOptions`, which is `ReactRenderOptions` without `heading`: a lone node has no composition title to draw. `heading` still controls it on `render`. Slack's `SlackRenderNodeOptions` omits `heading` for the same reason.

The options argument, and `context` inside it, is optional only when omitting it is sound. The SDK's own render context has no required field, so `{}` is a complete value and both may be left off; a pack that narrows the context with something mandatory makes them required for that binding rather than letting the surface fabricate a value missing fields its renderers will read.

`context` is typed by the runtime's `TRenderContext`, which is inferred from `styleAdapter` alone. A host that supplies no adapter and loads a pack that narrows its context, here a `chartsPack` whose renderers read a `ChartsRenderContext`, gets the SDK's `PrimitiveRenderContext` by inference, and a narrowed field in `context` is then an excess property. Name all three type parameters positionally to type it:

```ts
const runtime = createIsomerRuntime<unknown, ChartsRenderContext, ChartsTheme>({
  packs: [chartsPack],
  frames: { card: cardFrame },
});

runtime.surfaces.react.render(composition, { context: { resolveClassName } });
```

The first parameter is the host context views build with, the second the render context, the third the theme; [Runtime](runtime.md#typing-the-render-context) covers when each is worth naming.

The React surface imports `@elastic/isomer-sdk/react`, not `./html`, so that module does not load `react-dom/server`. The package entry still does: `createIsomerRuntime` always constructs both `react` and `html`, so `react` and `react-dom` are required peers of this package.

## Slack renders a node as a message

`slack.renderNode` returns the same `{ text, blocks, assets }` as `render`, fitted to Slack's limits, and takes the same options minus `heading`. A picture node degrades to markdown unless `collectAssets` is set, exactly as it does in a composition, so a host that can upload passes the option on both paths:

```ts
const { blocks, assets } = runtime.surfaces.slack.renderNode(chart, {
  collectAssets: true,
});
```

## A snapshot stops at markup and a stylesheet

The `snapshot` surface renders a composition once, inside a [frame](frame.md), at a fixed size and one color scheme, with no scripts. It returns `{ element, html, css, width, height, warnings }`, not image bytes. Rasterization is a separate capability a host opts into, and stopping at that boundary is what keeps this package isomorphic.

`element` is the same React tree the DOM gets, carrying class names, and `html` is that tree's static markup, rendered in the same call so the two cannot drift. A backend takes whichever it reads: takumi takes `html`, and one that lays out React elements takes `element`. `css` is the packs' stylesheet, which a rasterizer is handed the way a browser is handed a `<style>`. Its `light-dark(…)` values are already resolved to the render's scheme, because a snapshot is one static frame with no color scheme to resolve them against. Everything but `element` is plain data, so a host can cache `{ html, css, width, height }` or rasterize it in another process.

```ts
const { html, css, width, height, warnings } = runtime.surfaces.snapshot.render(composition, { theme: 'light' });
```

`anchors: true` renders node anchors into `element` and `html`, so a measured layout of either can be handed to the SDK's `checkLayout`.

`renderPages(compositions, options?)` lays several compositions out as one document, `{ pages, css, width, height, warnings }`: one `{ element, html }` page per composition against one stylesheet. A paged output such as a PDF needs that, and per-composition `render` calls cannot give it, because each collects only the CSS its own composition uses. Every page is the same size, the tallest estimate unless `height` is given, and the first composition's `theme` decides the palette unless `theme` is given. An empty list throws `EMPTY_PAGES`, and a body the frame rejects names its page, counted from 1. `warnings` on a paged result prefix each path with `pages[n].`.

`renderNode` on this surface takes only `frame`, `theme`, `anchors`, and `onValidationError`. Geometry is absent deliberately: a node drawn with no surround has nothing for a width or height to size. The result still reports one, the frame's `defaultWidth` and its estimate for a one-node body, so a rasterizer has a viewport to lay the node out in.

## Warnings are per surface

`validate` returns warnings alongside errors, and each warning names the surface it applies to. An empty surface matters to the host about to render it and is noise to the others, so narrow before showing:

```ts
import { warningsForSurface } from '@elastic/isomer-sdk';

const result = runtime.validate(composition);
const relevant = warningsForSurface(result, 'snapshot');
```

## A missing `snapshotHeight`

A node whose primitive declares no `metrics.snapshotHeight` measures as 0, and a frame that sums those heights sizes short. The finding is on the `snapshot` result, for the frame that render uses, so it carries `path` and `message` and no `surface`:

```ts
const { warnings } = runtime.surfaces.snapshot.render(composition, { frame: 'card' });
// [{ path: 'body[0]', message: 'body[0] type "kpi" declares no snapshotHeight metric and will be measured as 0, sizing the frame short' }]
```

`warnings` is empty when that frame's `estimateHeight` never calls `estimateSnapshotHeight`, and when the caller passes `height`, which is the height the render uses. `validate` reports nothing about the metric, so a runtime that also holds a fixed frame stays quiet on that frame's renders and on every other surface.

## CSS: one adapter, or a deliberate no-op

HTML rendering emits one `<style>` per document. A pack ships its own `styleAdapter` and the runtime combines them, routing each style handle to its owner, so a host loading styled packs supplies nothing. A pack is also CSS-bearing when any primitive declares `collectStyles`. Construction throws if such a pack has no adapter at all, naming both the pack and the primitive.

A host composing a CSS-bearing pack to render only text or Slack still has to answer for that CSS. The escape hatch is a no-op adapter — explicit rather than accidental:

```ts
const runtime = createIsomerRuntime({
  packs: [cssBearingPack],
  styleAdapter: {
    createCollector: () => ({}),
    createRenderContext: () => ({}),
    renderStyles: () => '',
  },
});
```

A host adapter replaces every pack's, so the no-op above silences all of them rather than one.

## Combining two packs' adapters

Two packs that each declare a `styleAdapter` need `ownsHandle(handle)` on both, so the runtime can route each style handle to the adapter that made it rather than guessing:

```ts
const runtime = createIsomerRuntime({
  packs: [chartsPack, calloutsPack], // both declare styleAdapter
});
```

If `calloutsPack`'s adapter omits `ownsHandle`, construction throws `AMBIGUOUS_STYLE_ADAPTER`: with two adapters and no way to ask one of them "is this handle yours?", a handle it did not create could be routed to it by elimination and rendered against the wrong theme. The fix is either adapter-side — `calloutsPack` adds `ownsHandle` — or host-side: pass a `styleAdapter` on `createIsomerRuntime` to replace both packs' own, which is also how the no-op above silences a single CSS-bearing pack.

`styleCollector` is a second, independent check: if `calloutsPack` declares one (naming the collector shape its `collectStyles` hooks expect) and the adapter actually serving it — its own, or `chartsPack`'s when `calloutsPack` declares none — creates a differently-tagged collector, construction throws `INCOMPATIBLE_STYLE_COLLECTOR` instead of corrupting the collector silently at render time. The fix is a `styleAdapter` both packs were written against — a host adapter, or one pack adopting the other's.

## Choosing one

| The channel is… | Call |
| --- | --- |
| A React app | `react`, plus your own wrapper and CSS |
| Email, a report, a static page | `html` (inline the CSS for mail clients) |
| Slack | `slack`, then upload `assets` |
| An agent transcript or chat reply | `markdown` |
| A terminal, SMS, any low-capability host | `text` |
| An image or a PDF | `snapshot`, then a rasterizer |

## Surfaces and formats

A surface is what the runtime renders; a format is what a host ships. Every surface but `snapshot` is also a format. PNG, SVG, and PDF are formats no surface produces on its own: a host-side rasterizer writes them from a snapshot, so neither the SDK nor the runtime depends on one.

| Format | Surface | Package |
| --- | --- | --- |
| React element | `react` | `@elastic/isomer-runtime` |
| HTML | `html` | `@elastic/isomer-runtime` |
| Slack Block Kit | `slack` | `@elastic/isomer-runtime` |
| Markdown | `markdown` | `@elastic/isomer-runtime` |
| Plain text | `text` | `@elastic/isomer-runtime` |
| PNG, SVG, PDF | `snapshot` | `@elastic/isomer-runtime` and [`@elastic/isomer-image-takumi`](../image-takumi/index.md) |

`getCapabilities()` is the programmatic version of that table. `surfaces` lists what `runtime.surfaces` holds, `snapshot` only when the runtime was given frames. `formats` lists every surface but `snapshot`, then the formats the host registered with `createIsomerRuntime({ formats })`. Pass the rasterizer's own list rather than typing one, so a format is reported only when something writes it:

```ts
const takumi = createTakumiImageBackend({ fonts });
const runtime = createIsomerRuntime({ packs, frames, formats: takumi.formats });

runtime.getCapabilities().formats;
// ['react', 'html', 'text', 'markdown', 'slack', 'png', 'svg', 'pdf']
```

## Next

[Frame](frame.md) · [Runtime](runtime.md) · [API reference](api.md)
