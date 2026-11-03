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

`createTakumiImageBackend`, `renderPng`, `renderPdf`, the `TAKUMI_FORMATS` list, the `PDF_ENGINE_CLOSED` code that `close()` rejects calls in flight with, and their types. See the [package docs](https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md) and their API tables.

`scale` must be positive and finite, or `png` rejects with a `RangeError`.[^barrel]

Related: [raster](/image-takumi/concepts/raster.md), [public contract](/image-takumi/reference/public-contract.md).

[^barrel]: Root barrel
