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

Nothing is registered by default: the host supplies `FontLoader` values for the families a pack's theme names. See the package docs on fonts.[^docs]

The PDF engine registers the same list separately, reading a lazy `data()` once per engine, and rejects a glyph no registered font covers by default, so a face covering what a theme draws through CSS `content:` is registered last as a fallback.[^docs][^backend]

Related: [raster](/image-takumi/concepts/raster.md), [determinism](/image-takumi/concepts/determinism.md).

[^docs]: Package docs

[^backend]: Takumi backend
