---
type: Concept
title: Fonts
description: Nothing is registered by default. Hosts supply FontLoader values; unregistered families fall back visibly in a PNG and fail a PDF.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/src/backend.ts
tags: [isomer, image-takumi, fonts]
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

# Definition

A pack names font families in its theme. Which files back them is the host's decision. `@takumi-rs/core` is built with `woff` and `woff2`, so a `@fontsource/*` file works as-is. A `FontLoader` is a URL string fetched on demand, an eager buffer, or a descriptor with a lazy `data()`; a filesystem path is not accepted. Registration order is takumi's fallback order. The PDF engine registers the same list separately, reading a lazy `data()` once per engine, and rejects a glyph no registered font covers by default, so a face covering what a theme draws through CSS `content:` is registered last as a fallback.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [determinism](/image-takumi/concepts/determinism.md).

[^docs]: Package docs

[^backend]: Takumi backend
