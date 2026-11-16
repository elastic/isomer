---
type: Concept
title: Style adapters
description: The HTML surface runs the host adapter if supplied, otherwise one Distillate adapter over the packs' distilleries.
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

The HTML and `snapshot` surfaces run the host's style adapter if one was passed, otherwise one adapter built from the packs. See the package doc on packs.[^docs]

Packs that declare a `distillery` share the SDK's `createDistillateStyleAdapter`: every renderer gets the same context, each handle is recorded by the distillery whose registry owns its module, and the stylesheet joins each distillery's rules in pack order. A pack that declares `collectStyles` beside them throws `INCOMPATIBLE_STYLE_COLLECTOR`, since that adapter never runs the hook. A pack `styleAdapter` runs only as the one pack-level style source; beside another pack's adapter or distillery it throws `AMBIGUOUS_STYLE_ADAPTER` unless the host passes `styleAdapter`.[^adapter]

Related: [pack composition](/runtime/concepts/packs.md), [rendering](/sdk/concepts/rendering.md).

[^adapter]: resolveStyleAdapter

[^docs]: Runtime packs
