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

The raster is byte-stable for the same input, process, and platform, which `backend.test.ts` asserts. Stability across darwin-arm64 and linux-x64 at a pinned `@takumi-rs/core` and a fixed font set is the slides example's operating assumption; CI runs Ubuntu only, so committed PNGs under the slides examples are compared byte-for-byte there and the cross-platform half is not independently verified. A PDF is byte-stable on the same terms once `metadata.creationDate` is fixed; unset, takumi stamps the render time. The slides example commits `deck.pdf` under the same comparison.[^docs][^examples]

Related: [raster](/image-takumi/concepts/raster.md), [slides pack](/slides/concepts/pack.md).

[^docs]: Package docs

[^examples]: Committed PNG artifacts
