---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise each pack's own, composed.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
tags: [isomer, runtime, css]
status: stable
stale_after: 2027-03-18
sources:
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
    title: resolveStyling
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/packs.md
    title: Runtime packs
---

# Definition

The HTML and `snapshot` surfaces run the host's style adapter if one was passed, otherwise each pack's own. See the package doc on packs.[^docs]

Two or more pack adapters compose: each gets its own collector, a pack's `react` renderers read its own adapter's render context wherever they are nested, with the fields a surface or container layered on carried over, and the stylesheet and each adapter's scoped script join theirs in pack order. A pack without an adapter is styled by the first pack that has one, and throws `AMBIGUOUS_STYLE_ADAPTER` if it declares `collectStyles`.[^adapter]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyling

[^docs]: Runtime packs
