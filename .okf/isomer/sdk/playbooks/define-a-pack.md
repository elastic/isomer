---
type: Playbook
title: Define a pack
description: Wrap primitives with definePrimitivePack and declare optional CSS and theme bounds.
tags: [isomer, sdk, playbook]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/packs.md
    title: Pack contract
  - id: pack
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/pack/primitive_pack.ts
    title: definePrimitivePack
  - id: registration
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/testing/registration.ts
    title: Pack registration check
---

# Steps

Collect primitives with `definePrimitive`, wrap them with `definePrimitivePack`, declare a style adapter and palette bound where needed, and check registration in tests. See the package doc on the pack contract.[^docs]

- If the pack's react renderers read a frame's palette, name it: `definePrimitivePack<T>(input)`. Never publish a bare `PrimitivePack`.[^pack]

Related: [packs](/sdk/concepts/packs.md), [runtime packs](/runtime/concepts/packs.md).

[^docs]: Pack contract

[^pack]: definePrimitivePack
