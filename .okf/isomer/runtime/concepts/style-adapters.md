---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise the one pack adapter.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
tags: [isomer, runtime, css]
status: stable
stale_after: 2027-03-18
sources:
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
    title: resolveStyleAdapter
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/packs.md
    title: Runtime packs
---

# Definition

The HTML surface runs the host's style adapter if one was passed, otherwise the adapter of the one composed pack that declares one. See the package doc on packs.[^docs]

Two packs declaring an adapter throw `AMBIGUOUS_STYLE_ADAPTER` unless the host passes its own; there is no composite adapter, so a render context is the adapter's own object.[^adapter]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyleAdapter

[^docs]: Runtime packs
