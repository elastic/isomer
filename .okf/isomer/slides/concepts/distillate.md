---
type: Concept
title: Distillate
description: '@elastic/distillate ^0.1.0 from the registry. The pack stylesheet is collected through DISTILLATE_STYLE_COLLECTOR.'
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

Distillate is `^0.1.0` from the registry, not a path. The pack authors CSS modules against it and declares `styleCollector: DISTILLATE_STYLE_COLLECTOR`. The SDK adapter is a string match, not an import of Distillate.[^package][^styling]

Related: [pack](/slides/concepts/pack.md), [style adapters](/runtime/concepts/style-adapters.md).

[^package]: Package dependencies

[^styling]: Styling
