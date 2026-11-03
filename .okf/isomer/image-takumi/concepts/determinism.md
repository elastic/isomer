---
type: Concept
title: Determinism
description: At a pinned takumi and a fixed font set, the same input produces identical PNG bytes, and identical PDF bytes at a fixed creationDate.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
tags: [isomer, image-takumi, determinism]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-image-takumi/docs/index.md
    title: Package docs
  - id: examples
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/src/examples/output
    title: Committed PNG artifacts
---

# Definition

The same input renders identical PNG bytes on one platform, and identical PDF bytes once `metadata.creationDate` is fixed; cross-platform stability is assumed, not verified. See the package docs on determinism and the committed artifacts.[^docs][^examples]

Related: [raster](/image-takumi/concepts/raster.md), [slides pack](/slides/concepts/pack.md).

[^docs]: Package docs

[^examples]: Committed PNG artifacts
