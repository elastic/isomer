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

The dispatcher is keyed on `type` and nothing else. A missing renderer is a structured error, not a silent skip. A pack's inventory is surface-erased, so callers pass the node type parameter into `createPrimitiveDispatcher`.[^docs]

On `snapshot`, the renderer's `scope.renderReact` preserves snapshot visibility and the frame palette for descendants, including across fresh contexts and deferred React components. `scope.renderOn` selects a surface and extras explicitly.[^docs]

`renderReact`'s `context` argument, on the dispatcher and on `RenderScope`, is optional only when `{}` is a complete context for the pack. A pack with a required context field makes containers pass the child's context explicitly; it is not inherited from the parent.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [rendering](/sdk/concepts/rendering.md), [composition](/sdk/concepts/composition.md).

[^docs]: Dispatch
