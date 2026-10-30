---
type: Concept
title: Dispatch
description: createPrimitiveDispatcher routes a node to its renderer by type.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/dispatch.md
tags: [isomer, sdk, dispatch]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/dispatch.md
    title: Dispatch
---

# Definition

`createPrimitiveDispatcher` routes a node to its renderer by `type` alone, applying surface visibility, renderer presence, and `sanitize` before a renderer sees it. See the package doc on dispatch.[^docs]

A pack's inventory is surface-erased, so callers pass the node type parameter into `createPrimitiveDispatcher`.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [rendering](/sdk/concepts/rendering.md), [composition](/sdk/concepts/composition.md).

[^docs]: Dispatch
