---
type: Concept
title: Pack composition
description: Packs are additive. collectStyles routes only to the pack that declared the adapter.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
tags: [isomer, runtime, packs]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/packs.md
    title: Runtime packs
  - id: adapter
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/style_adapter.ts
    title: composeStyleAdapters
---

# Definition

Two packs in one runtime union their types. Duplicate `type` or enhancement id throws. CSS composes too: each adapter gets a collector, each style handle routes to the adapter that `ownsHandle`, and `collectStyles` fires only on the pack that declared the adapter.[^docs][^adapter]

A type no adapter-declaring pack owns still reaches every adapter. Combining adapters where one cannot answer `ownsHandle` throws. A CSS-bearing pack with no adapter throws, naming the pack and the primitive.

Related: [SDK packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Runtime packs

[^adapter]: composeStyleAdapters
