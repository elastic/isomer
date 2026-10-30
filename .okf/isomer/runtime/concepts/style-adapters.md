---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise the packs' own, combined.
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

The HTML surface runs the host's style adapter if one was passed, otherwise the packs' adapters combined. See the package doc on packs.[^docs]

The combined adapter's render context is a view over each pack's context, not a copy: a key reads from the last pack that has it, with methods bound to their own context, so a class-instance context keeps its private state.[^adapter]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyleAdapter

[^docs]: Runtime packs
