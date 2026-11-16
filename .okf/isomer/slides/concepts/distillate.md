---
type: Concept
title: Distillate
description: '@elastic/distillate ^0.2.0 from the registry. The pack declares its distillery; the SDK adapter styles it.'
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

The pack authors its CSS with Distillate and declares `slideDistillery` as its `distillery`; the SDK's Distillate adapter styles it. See the package doc on styling.[^styling]

Distillate is `^0.2.0` from the registry, not a path. The SDK does not depend on Distillate.[^package]

Related: [pack](/slides/concepts/pack.md), [style adapters](/runtime/concepts/style-adapters.md).

[^package]: Package dependencies

[^styling]: Styling
