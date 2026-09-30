---
navigation_title: Takumi image backend
description: Renders the svg surface's element and stylesheet to PNG, SVG, or PDF bytes with Takumi.
---

# Takumi image backend

`@elastic/isomer-image-takumi` rasterizes the `svg` surface's output with [takumi](https://takumi.kane.tw). PNG, SVG, or PDF out; nothing else.

```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
const pdf = await takumi.pdf(runtime.surfaces.svg.renderPages(deck));
```

## What it is

The `svg` surface returns `{ element, css, width, height }` — the same React tree the DOM gets, paired with the pack's stylesheet and the viewport it was measured for. This package serializes that tree, hands it to takumi's `fromHtml`, and lays it out. No primitive writes an image renderer, and this package holds no opinion about compositions.

`ImageInput` is declared structurally rather than imported, so this package depends on no isomer package — `react` and `react-dom` are its only peers. `SvgRenderResult` from `@elastic/isomer-runtime` satisfies it, and `SvgPagesResult`, what the surface's `renderPages` returns, satisfies `PdfInput` the same way.

## Measuring a layout

`createTakumiImageBackend` returns a `TakumiBackend`: a `TakumiMeasuringBackend`, whose `measure(input)` lays the input out exactly as `png` would and returns a `LayoutBox` tree: each element's canvas `x`, `y`, `width`, and `height`, its `scaleX` and `scaleY`, its text `runs`, its `attributes`, and its `children`. `scale` is whichever axis scale is further from 1, so any other value means the box is scaled. A host reads the tree to find content past its area without a browser.

`attributes` holds everything but `class`, `id`, and `style`, so a node anchor (`data-isomer-node`) comes back on the box its element laid out. Render with the `svg` surface's `anchors: true` and the tree can go straight to the SDK's `checkLayout`, which reports nodes past their room or on a sibling. Takumi folds inline content into its parent's text runs, so where a parent's laid-out children do not line up one to one with its elements, none of those children carry attributes rather than the wrong ones.

`TakumiImageBackend`, the `{ png, svg }` contract `renderPng` takes, does not include `measure` or `pdf`, so a custom raster backend need not implement them; `TakumiMeasuringBackend` adds only `measure`, and `TakumiPdfBackend`, what `renderPdf` takes, is `{ pdf }` alone. `TakumiBackend` is all three.

## Rendering a whole runtime call in one step

`renderPng(runtime, composition, backend, options?)` bundles validation, the `svg` surface, and rasterization, returning `{ png, width, height, validation }`. It exists because the `svg` surface discards its own validation findings and knows nothing about image backends, so a host that wants the findings next to the bytes would otherwise validate, render, and rasterize in three calls of its own.

```ts
import { renderPng } from '@elastic/isomer-image-takumi';

const { png, validation } = await renderPng(runtime, composition, takumi, {
  svg: { frame: 'card' },
});
```

The composition is rendered even when invalid — `validation` is how a caller finds out, rather than a thrown error — unless the SDK refused it before parsing, which throws `CompositionValidationError`. `runtime` and `composition` are declared structurally, the same way `ImageInput` is.

## Rendering a PDF

`pdf(input, options?)` writes one page per entry in `input.pages`, each `input.width` by `input.height` CSS pixels (a PDF point is 0.75 of one) with no margin, so a frame fills its page. The output is vector: text stays selectable, and the registered fonts are subset and embedded. Every page shares one stylesheet, which is why the input is the `svg` surface's `renderPages` result rather than a list of `render` results: each `render` collects only the CSS its own composition uses, and `renderPages` collects across the whole deck.

```ts
const pdf = await takumi.pdf(runtime.surfaces.svg.renderPages(deck), {
  metadata: { title: 'Quarterly review', creationDate: '2026-01-01' },
});
```

Each page is wrapped in a fixed-size block that ends the page, so a frame that runs long is clipped rather than spilling onto a page of its own. The options are the document's, not the pages': `metadata` (title, description, authors, keywords, creator, and `creationDate`), `outline`, `lang`, `backgroundColor`, `uncoveredText`, and `images`.

Two differences from `png` matter. A glyph no registered font covers rejects the render by default, naming the code point, where `png` draws takumi's built-in face; `uncoveredText: 'placeholder'` or `'blank'` relaxes that, and the better fix is registering a face that covers what the theme draws, including anything it draws through CSS `content:`. And the PDF engine fetches nothing: a remote `img` source draws blank unless its bytes are passed in `images` as `[{ src, data }]`, while a `data:` URI needs no entry. Takumi's PDF output also rejects `filter: blur()`, `drop-shadow()`, and `backdrop-filter`.

`renderPdf(runtime, deck, backend, options?)` is `renderPng`'s counterpart: it validates every composition, calls `renderPages` with `onValidationError: 'collect'`, and returns `{ pdf, pageCount, width, height, validations }`, one validation per composition. As with `renderPng`, input the SDK refuses before parsing throws. An empty deck throws the runtime's `EMPTY_PAGES`.

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

## Status

Published with the other workspace packages at one version. It is a host-side rasterizer: the runtime stays free of native dependencies, and a host that draws images adds this package. `@takumi-rs/core` is a native binary, loaded when the package is imported; `takumi-pdf` is WebAssembly, imported on the first PDF, so a host that never asks for one never loads it.
