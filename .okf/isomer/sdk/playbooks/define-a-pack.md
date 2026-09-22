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

1. Collect primitives with `definePrimitive`.
2. Call `definePrimitivePack` with a stable `id` and at least one primitive.
3. If any primitive has `collectStyles`, declare `styleAdapter`; `styleCollector` is derived from it unless overridden.
4. If svg renderers read a palette, pass `theme: themeBound<T>()`. Never publish a bare `PrimitivePack`.
5. In tests, call `assertPackRegistrationComplete` on the primitives directory, and assert the registry array and the body-node union agree. Keep that assertion in a test file so it stays outside the build graph.[^docs][^pack][^registration]

Related: [packs](/sdk/concepts/packs.md), [runtime packs](/runtime/concepts/packs.md).

[^docs]: Pack contract

[^pack]: definePrimitivePack

[^registration]: Pack registration check
