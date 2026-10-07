---
type: Playbook
title: Render pdf
description: Hand the snapshot surface's renderPages result to createTakumiImageBackend's pdf.
tags: [isomer, image-takumi, playbook, pdf]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
  - id: backend
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
    title: Takumi backend
---

# Steps

1. Render the deck with `runtime.surfaces.snapshot.renderPages(compositions, { frame })`, so every page shares one stylesheet, one size, and one theme.
2. Construct `createTakumiImageBackend({ fonts })` with faces covering every glyph the pack's theme draws, including CSS `content:` markers; a PDF rejects an uncovered glyph.
3. Call `.pdf(pages, { metadata: { title, creationDate } })`; fix `creationDate` for byte-stable output, and pass `images` for any remote `img` source.
4. Or call `renderPdf(runtime, deck, backend, { snapshot: { frame } })` for the bytes with one validation per composition.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [fonts](/image-takumi/concepts/fonts.md), [rasterize a snapshot](/image-takumi/playbooks/rasterize-a-snapshot.md).

[^docs]: Package docs

[^backend]: Takumi backend
