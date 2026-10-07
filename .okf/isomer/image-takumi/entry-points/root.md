---
type: Entry Point
title: Root
description: '@elastic/isomer-image-takumi createTakumiImageBackend, renderPng, and renderPdf.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/index.ts
tags: [isomer, image-takumi, api]
status: stable
stale_after: 2027-03-18
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/index.ts
    title: Root barrel
---

# Definition

`createTakumiImageBackend({ fonts?, cacheMaxBytes? })` returns a `TakumiBackend`, `{ png, svg, measure, pdf, formats }`: a `TakumiMeasuringBackend` (`{ png, svg, measure }`) plus `TakumiPdfBackend`, with `formats` set to `TAKUMI_FORMATS` (`['png', 'svg', 'pdf']`). An `ImageInput` is `{ html, css, width, height }`. `png(input, { devicePixelRatio? })` raises fidelity at the input's size; `svg` takes no raster options. `measure` lays an input out as `png` would and returns its `LayoutBox` tree: each element's canvas `x`, `y`, `width`, and `height`, its `scaleX`, `scaleY`, and `scale` (whichever axis scale is further from 1), its positioned text `runs`, its `attributes` other than `class`, `id`, and `style`, and its `children`. A parent whose laid-out children do not line up one to one with its elements, as when inline content folds into runs, passes no attributes to them. `pdf(input, options?)` takes a `PdfInput`, `{ pages, css, width, height }` with `{ html }` pages, and writes one page per entry; `TakumiPdfOptions` is `metadata`, `uncoveredText`, `images`, `outline`, `lang`, and `backgroundColor`. `pdf` throws on an empty `pages` list. `TakumiImageBackend`, what `renderPng` takes, stays `{ png, svg }`; `TakumiPdfBackend`, what `renderPdf` takes, is `{ pdf }`. `renderPng(runtime, composition, backend, options?)` validates, renders through the runtime's `snapshot` surface with `onValidationError: 'collect'`, rasterizes, and returns `{ png, width, height, validation }`; `renderPdf(runtime, deck, backend, options?)` does the same per composition through `renderPages` and returns `{ pdf, pageCount, width, height, validations }`. Both draw the copy validation checked and throw an error identified as `CompositionValidationError` for input refused before parsing. `PngRuntime` and `PdfRuntime` declare the runtime slice each needs structurally. Font types are re-exported from `@takumi-rs/core` and `ImagesInput` from `takumi-pdf`.[^barrel]

Related: [raster](/image-takumi/concepts/raster.md), [public contract](/image-takumi/reference/public-contract.md).

[^barrel]: Root barrel
