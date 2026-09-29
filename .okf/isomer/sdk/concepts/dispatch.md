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

With no Slack renderer, a node degrades through its markdown: builder content is translated to Block Kit from its tree, printing a literal `*`, `_`, `~`, or backtick Slack would pair as a lookalike, and a string result goes through `gfmToSlackBlocks`, which pairs emphasis as GFM does but reads one line at a time.[^docs]

Related: [primitives](/sdk/concepts/primitives.md), [rendering](/sdk/concepts/rendering.md), [composition](/sdk/concepts/composition.md).

[^docs]: Dispatch
