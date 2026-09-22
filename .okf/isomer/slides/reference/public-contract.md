---
type: Reference
title: Public contract
description: private true as the in-repo reference pack, distillate from the registry, workspace sdk, runtime and takumi as devDependencies.
tags: [isomer, slides, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/package.json
    title: Package metadata
---

# Definition

- Published with the workspace at one version, as the reference pack. Depends on `@elastic/distillate` `^0.1.0` and `@elastic/isomer-sdk` `workspace:*`.
- Peers: `react` `>=18 <20`, `zod` `^4.4.1`.
- Dev dependencies: `@elastic/isomer-runtime` and `@elastic/isomer-image-takumi` for examples and raster fixtures.[^package]

Related: [pack](/slides/concepts/pack.md), [distillate](/slides/concepts/distillate.md).

[^package]: Package metadata
