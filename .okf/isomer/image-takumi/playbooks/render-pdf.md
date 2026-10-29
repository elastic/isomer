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

Render the deck with the `snapshot` surface's `renderPages`, build the backend with fonts covering every drawn glyph, and call `pdf` with a fixed `creationDate`, or `renderPdf`. See the package docs on rendering a PDF and the backend source.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [fonts](/image-takumi/concepts/fonts.md), [rasterize a snapshot](/image-takumi/playbooks/rasterize-a-snapshot.md).

[^docs]: Package docs

[^backend]: Takumi backend
