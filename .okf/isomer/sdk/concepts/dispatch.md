---
type: Concept
title: Dispatch
description: createPrimitiveDispatcher routes a node to its renderer by type.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/dispatch.md
tags: [isomer, sdk, dispatch]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.6, at: 2026-09-18T22:35:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/dispatch.md
    title: Dispatch
---

# Definition

The dispatcher is keyed on `type` and nothing else. A missing renderer is a structured error, not a silent skip. A pack's inventory is surface-erased, so callers pass the node type parameter into `createPrimitiveDispatcher`.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [rendering](/sdk/concepts/rendering.md), [composition](/sdk/concepts/composition.md).

[^docs]: Dispatch
