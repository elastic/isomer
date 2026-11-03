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

Packs are additive in their types; a runtime runs one style adapter, so at most one composed pack declares one unless the host passes its own. See the package doc on packs.[^docs]

Related: [SDK packs](/sdk/concepts/packs.md), [style adapters](/runtime/concepts/style-adapters.md).

[^docs]: Runtime packs
