---
type: Concept
title: Raster
description: createTakumiImageBackend renders the snapshot surface's output to PNG, SVG, or PDF.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
tags: [isomer, image-takumi]
status: stable
stale_after: 2027-03-18
sources:
  - id: backend
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
    title: Takumi backend
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
---

# Definition

The `snapshot` surface returns `{ element, html, css, width, height }`. This package reads `html`, hands it and the stylesheet to takumi's `fromHtml`, and lays it out. PNG, SVG, or PDF out; nothing else, and `TAKUMI_FORMATS` (the backend's `formats`) says so for `createIsomerRuntime({ formats })`. `ImageInput`, `{ html, css, width, height }`, is declared structurally, so this package depends on no isomer package and no React. `pdf(input, options?)` takes the surface's `renderPages` result (`PdfInput`, `{ html }` pages against one stylesheet) and writes one page per entry at the input's size with no margin, each page in a fixed-size block that ends it; the output is vector, with selectable text and the registered fonts embedded. A glyph no registered font covers rejects the render unless `uncoveredText` relaxes it, and a remote `img` draws blank unless its bytes are passed in `images`.[^backend][^docs]

Related: [surfaces](/runtime/concepts/surfaces.md), [fonts](/image-takumi/concepts/fonts.md), [rasterize a snapshot](/image-takumi/playbooks/rasterize-a-snapshot.md), [render pdf](/image-takumi/playbooks/render-pdf.md).

[^backend]: Takumi backend

[^docs]: Package docs
