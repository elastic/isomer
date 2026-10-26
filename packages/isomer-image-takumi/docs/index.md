---
navigation_title: Takumi image backend
description: Renders the snapshot surface's markup and stylesheet to PNG, SVG, or PDF bytes with Takumi.
---

# Takumi image backend

`@elastic/isomer-image-takumi` rasterizes the `snapshot` surface's output with [takumi](https://takumi.kane.tw): PNG, SVG, or PDF out, and a measured layout for the SDK's `checkLayout`.

```sh
npm install @elastic/isomer-image-takumi
```

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const runtime = createIsomerRuntime({ packs, frames, formats: takumi.formats });
const png = await takumi.png(runtime.surfaces.snapshot.render(composition));
const pdf = await takumi.pdf(runtime.surfaces.snapshot.renderPages(deck));
```

## What it is

The `snapshot` surface returns `{ element, html, css, width, height }`: the same React tree the DOM gets, that tree's static markup, the pack's stylesheet, and the viewport it was measured for. This package reads `html`, hands it and the stylesheet to takumi's `fromHtml`, and lays it out. No primitive writes an image renderer, and this package holds no opinion about compositions.

`ImageInput`, `{ html, css, width, height }`, is declared structurally rather than imported, so this package depends on no isomer package and on no React. `SnapshotRenderResult` from `@elastic/isomer-runtime` satisfies it, and `SnapshotPagesResult`, what the surface's `renderPages` returns, satisfies `PdfInput` the same way. Because the input is plain data, a host can render a snapshot in one process and rasterize it in another.

`createTakumiImageBackend({ fonts, cacheMaxBytes })` builds one takumi renderer. `fonts` is covered [below](#fonts); `cacheMaxBytes` caps takumi's resource cache, and `0` disables it. `png(input, { scale })` renders a denser raster of the same layout: `scale: 2` gives a PNG of `input.width * 2` by `input.height * 2` pixels, rounded, for a 2x display. Takumi takes one ratio for both axes, so the ratio stays `scale` and the canvas absorbs the rounding: a layout fixed in CSS pixels, as a frame's is, lays out exactly as at 1x, with under half a raster pixel trimmed or padded at the right and bottom edges, while content sized to the viewport sees one within half a raster pixel of the input's. Whole products, such as any `scale: 2`, are exact. `devicePixelRatio` is takumi's zoom at a fixed canvas instead: the PNG stays `input.width` by `input.height`, laid out at `input.width / devicePixelRatio` CSS pixels and magnified, so above 1 it shows less of the frame. The two multiply. `svg` and `measure` are in CSS pixels, so they take no raster options.

## Sizing to content

A frame declared with `sizing: 'content'` (see the runtime's [Frame](../../isomer-runtime/docs/frame.md#sizing-to-content)) makes the `snapshot` surface return `heightMode: 'content'`, with `height` only the frame's estimate. `ImageInput` and `PdfInput` take the same optional `heightMode` (`HeightMode`, `'fixed'` or `'content'`; absent is `fixed`), and every method honors it:

- `png`, `svg`, and `measure` lay out at `width` with no height, and takumi sizes the canvas to the root. That is the same single layout pass a fixed render makes, so a content-sized PNG costs nothing extra. `scale` and `devicePixelRatio` apply as before; the raster's height is the content's at that ratio.
- `fit(input, { devicePixelRatio }?)` resolves the height without drawing: it returns the input with `height` set to the laid-out height, rounded up to whole CSS pixels, and `heightMode: 'fixed'`, and returns any other input unchanged. It costs one layout pass and no raster. `renderPng` calls it first when the backend has it, so `RenderPngResult.height` is the measured height, and draws the PNG at exactly that height.
- `pdf` lays each page out alone with the PDF engine, at the page width with no height, and sizes every page to the tallest: a PDF's pages share one size, as they do for a fixed frame. That is one extra layout pass per page. `fitPages(input)` does that measuring on its own, and `renderPdf` calls it so `RenderPdfResult.height` reports the page height.

`fit` and `fitPages` are optional on `TakumiImageBackend` and `TakumiPdfBackend`, so a custom backend need not measure; `renderPng` and `renderPdf` then report the frame's estimate. `TakumiBackend` always has both.

The root's own height is what is measured. A frame that pins its root to the viewport's `height` measures as the estimate, and a percentage height does not resolve without a viewport height to resolve against.

`formats` on the backend is `TAKUMI_FORMATS`, `['png', 'svg', 'pdf']`: one entry per method that writes a format. Pass it to `createIsomerRuntime({ formats })` and the runtime's `getCapabilities().formats` reports what this backend adds, rather than a list typed by hand.

## Measuring a layout

`createTakumiImageBackend` returns a `TakumiBackend`: a `TakumiMeasuringBackend`, whose `measure(input)` lays the input out exactly as `png` would and returns a `LayoutBox` tree: each element's canvas `x`, `y`, `width`, and `height`, its `scaleX` and `scaleY`, its text `runs`, its `attributes`, and its `children`. `scale` is whichever axis scale is further from 1, so any other value means the box is scaled. A host reads the tree to find content past its area without a browser.

`attributes` holds everything but `class`, `id`, and `style`, so a node anchor (`data-isomer-node`) comes back on the box its element laid out. Render with the `snapshot` surface's `anchors: true` and the tree can go straight to the SDK's `checkLayout`, which reports nodes past their room or on a sibling. Takumi folds inline content into its parent's text runs, so where a parent's laid-out children do not line up one to one with its elements, none of those children carry attributes rather than the wrong ones.

`TakumiImageBackend`, the `{ png, svg }` contract `renderPng` takes (with an optional `fit`), does not include `measure` or `pdf`, so a custom raster backend need not implement them; `TakumiMeasuringBackend` adds only `measure`, and `TakumiPdfBackend`, what `renderPdf` takes, is `{ pdf }` alone. `TakumiBackend` is all three.

## Rendering a whole runtime call in one step

`renderPng(runtime, composition, backend, options?)` bundles validation, the `snapshot` surface, and rasterization, returning `{ png, width, height, validation }`. It forwards `scale` and `devicePixelRatio` to `png`; `width` and `height` are the viewport in CSS pixels, not the raster's, and under a content-sized frame `height` is the measured one. It exists because the `snapshot` surface discards its own validation findings and knows nothing about image backends, so a host that wants the findings next to the bytes would otherwise validate, render, and rasterize in three calls of its own.

```ts
import { renderPng } from '@elastic/isomer-image-takumi';

const { png, validation } = await renderPng(runtime, composition, takumi, {
  snapshot: { frame: 'card' },
});
```

The composition is rendered even when invalid — `validation` is how a caller finds out, rather than a thrown error — unless it was refused before parsing, which throws an error identified as the SDK's `CompositionValidationError` by `name`, `code`, and `errors`. What is drawn is the `composition` the validation result carries, the copy it checked, so `validation` describes the image; a runtime whose `validate` returns no such copy is refused with an error rather than drawing the input. `runtime` and `composition` are declared structurally, the same way `ImageInput` is.

## Rendering a PDF

`pdf(input, options?)` writes one page per entry in `input.pages`, each `input.width` by `input.height` CSS pixels (a PDF point is 0.75 of one) with no margin, so a frame fills its page. The output is vector: text stays selectable, and the registered fonts are subset and embedded. Every page shares one stylesheet, which is why the input is the `snapshot` surface's `renderPages` result rather than a list of `render` results: each `render` collects only the CSS its own composition uses, and `renderPages` collects across the whole deck.

```ts
const pdf = await takumi.pdf(runtime.surfaces.snapshot.renderPages(deck), {
  metadata: { title: 'Quarterly review', creationDate: '2026-01-01' },
});
```

Each page is wrapped in a fixed-size block that ends the page, so a frame that runs long is clipped rather than spilling onto a page of its own. The options are the document's, not the pages': `metadata` (title, description, authors, keywords, creator, and `creationDate`), `outline`, `lang`, `backgroundColor`, `uncoveredText`, and `images`.

Two differences from `png` matter. A glyph no registered font covers rejects the render by default, naming the code point, where `png` draws takumi's built-in face; `uncoveredText: 'placeholder'` or `'blank'` relaxes that, and the better fix is registering a face that covers what the theme draws, including anything it draws through CSS `content:`. And the PDF engine fetches nothing: a remote `img` source draws blank unless its bytes are passed in `images` as `[{ src, data }]`, while a `data:` URI needs no entry. Takumi's PDF output also rejects `filter: blur()`, `drop-shadow()`, and `backdrop-filter`.

### Off the calling thread

Takumi's PDF engine is WebAssembly, and its layout, font shaping, and PDF writing run synchronously, so on the calling thread a PDF holds that thread's event loop for the whole render. The backend therefore runs it in a `worker_threads` Worker by default (`pdfThread: 'worker'`), started on the first `pdf` or `fitPages`, with the fonts registered there once. The worker holds the process open only while a call is in flight, a lazy font `data()` or image `data()` is read on the calling thread and its bytes posted, and if the worker dies the next call starts another. `close()` stops it and rejects every call in flight, including one still loading a font or image, without waiting on the loader; a later call starts a fresh one. `pdfThread: 'inline'` keeps the engine on the calling thread, for a host that already calls from a worker of its own. `png`, `svg`, and `measure` need neither: `@takumi-rs/core` is native and renders on the libuv thread pool.

`renderPdf(runtime, deck, backend, options?)` is `renderPng`'s counterpart: it validates every composition, calls `renderPages` on the copies validation checked with `onValidationError: 'collect'`, and returns `{ pdf, pageCount, width, height, validations }`, one validation per composition. As with `renderPng`, input refused before parsing throws. An empty deck throws the runtime's `EMPTY_PAGES` before the backend sees it; `pdf` itself throws on an empty `pages` list.

## Fonts

Nothing is registered by default. A pack names font families in its theme, and which files back them is the host's decision, the way the stylesheet is the host's on the React surface — so an unregistered family falls back to takumi's built-in face, visibly, in a PNG, and fails a PDF (see above).

`@takumi-rs/core` is built with takumi's `woff` and `woff2` features, so a `@fontsource/*` file works as-is with no conversion step:

```ts
const fonts = [
  { name: 'Inter', weight: 700, data: () => readFile(interBold) },
];
```

A `FontLoader` string is a URL takumi fetches on demand, not a filesystem path — `fetch` rejects a bare path and a `file:` URL alike — so a local file goes in as an eager buffer or a lazy `data()`, as above. Registration order is takumi's fallback order. The PDF engine is a second takumi instance and registers the same list separately, so a lazy `data()` is read once per engine.

## Determinism

The raster is byte-stable for the same input, same process, same platform — `backend.test.ts` asserts this directly, and it is what lets a committed PNG be compared byte-for-byte rather than by pixel tolerance. Cross-platform stability (darwin-arm64 producing the same bytes as linux-x64, at a pinned `@takumi-rs/core` and a fixed font set) is the deck example's operating assumption, but CI runs Ubuntu only, so that half of the claim is not independently verified here.

A PDF is byte-stable on the same terms once `metadata.creationDate` is fixed; left unset, takumi stamps the render time and no two renders match. The deck example commits `deck.pdf` beside its PNGs under the same CI-only comparison.

## API

| Export | What it is |
| --- | --- |
| `createTakumiImageBackend` | `(options?: TakumiImageBackendOptions) => TakumiBackend`; `fonts`, `cacheMaxBytes`, and `pdfThread` |
| `TAKUMI_FORMATS` | `['png', 'svg', 'pdf']`, as const: what a `TakumiBackend` writes, and its `formats` |
| `renderPng` | `(runtime, composition, backend, options?) => Promise<RenderPngResult>`, `{ png, width, height, validation }` |
| `renderPdf` | `(runtime, deck, backend, options?) => Promise<RenderPdfResult>`, `{ pdf, pageCount, width, height, validations }` |

| Type | Shape |
| --- | --- |
| `ImageInput`, `PdfInput` | The parts of the `snapshot` surface's `render` and `renderPages` results this package reads, declared structurally: `{ html, css, width, height, heightMode? }`, and `pages` of `{ html }` |
| `HeightMode` | `'fixed' \| 'content'`: whether the output is the input's `height` or the laid-out content's. See [Sizing to content](#sizing-to-content) |
| `TakumiImageBackend`, `TakumiMeasuringBackend`, `TakumiPdfBackend`, `TakumiBackend` | `{ png, svg, fit? }`, plus `measure`, `{ pdf, fitPages? }`, and all three with `formats`, `fit`, `fitPages`, and `close` |
| `TakumiImageBackendOptions`, `TakumiRenderOptions` | `{ fonts?, cacheMaxBytes?, pdfThread? }` and `{ scale?, devicePixelRatio? }` |
| `TakumiPdfOptions`, `TakumiPdfMetadata` | The document options above, and `metadata`'s fields |
| `LayoutBox` | What `measure` returns, one per laid-out element |
| `PngRuntime`, `PdfRuntime` | The slice of a runtime `renderPng` and `renderPdf` need: `validate` and the `snapshot` surface |
| `SnapshotOptions`, `RenderPngOptions`, `RenderPdfOptions` | The forwarded `snapshot` options, and each helper's options |
| `RenderPngResult`, `RenderPdfResult`, `PngValidationResult`, `PngCheckedValidationResult` | The helpers' results and the validation shapes they carry |
| `Font`, `FontDetails`, `FontLoader`, `ImagesInput` | Re-exported from `@takumi-rs/core` and `takumi-pdf`, so a host types `fonts` and `images` without a second import |

`src/api_reference.test.ts` fails when a name exported from `src/index.ts` is missing from this page.

## Status

Published with the other workspace packages at one version, as ESM and CommonJS from one entry point. It is a host-side rasterizer: the runtime stays free of native dependencies, and a host that draws images adds this package. `@takumi-rs/core` is a native binary, loaded when the package is imported, with a prebuilt binary per platform as its own optional dependencies; `takumi-pdf` is WebAssembly, imported on the first PDF, in a worker thread by default, so a host that never asks for one never loads it.
