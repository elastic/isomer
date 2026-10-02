---
type: Concept
title: Distillate
description: '@elastic/distillate ^0.2.0 from the registry. The pack owns its Distillate HTML style adapter.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/package.json
tags: [isomer, slides, distillate]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/package.json
    title: Package dependencies
  - id: styling
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/styling.md
    title: Styling
---

# Definition

Distillate is `^0.2.0` from the registry, not a path. The pack authors CSS modules against it, and `src/theme/style_adapter.ts` turns its distillery into the HTML style adapter, tagged `DISTILLATE_STYLE_COLLECTOR`, with readable class names. The SDK does not depend on Distillate.[^package][^styling]

Related: [pack](/slides/concepts/pack.md), [style adapters](/runtime/concepts/style-adapters.md).

[^package]: Package dependencies

[^styling]: Styling
