---
type: Concept
title: Packs
description: definePrimitivePack builds a vocabulary value. styleCollector is derived from the style adapter unless overridden.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/pack/primitive_pack.ts
tags: [isomer, sdk, packs]
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

# Definition

A pack is a vocabulary as a value: `id`, `primitives`, optional `surfaces`, `enhancements`, `slackAssetTypes`, `styleAdapter`, `styleCollector`, and `theme`. `definePrimitivePack` builds one and checks it. Node types must be unique within a pack; `definePrimitivePack` and `extendPrimitivePack` throw `DUPLICATE_PRIMITIVE_TYPE` on a repeat, and `composePacks` reports the cross-pack case.[^docs][^pack]

`styleCollector` names the collector shape `collectStyles` hooks mutate. `definePrimitivePack` derives it from `styleAdapter.styleCollector` unless the pack sets it. Distillate-backed packs use the string `DISTILLATE_STYLE_COLLECTOR` (`'distillate'`). The SDK does not depend on `@elastic/distillate`.

`theme: themeBound<T>()` is a phantom so the pack infers `PrimitivePack<T>`. Bare `PrimitivePack` is `PrimitivePack<unknown>`, which asks nothing of a frame; `AnyPrimitivePack` (`PrimitivePack<never>`) is the runtime's storage form.

The registry array and the body-node union are both hand-written. `assertPackRegistrationComplete` fails when a primitives subdirectory is absent from the registry. A directory missing from both lists leaves them agreeing, so it compiles and every other test passes. Deriving the union from the registry does not compile (`TS7022` through the container primitives). `buildJsxShim` and `buildObjectBuilders` already derive the authoring fronts from the registry value.[^registration]

Composing packs into a runtime is the runtime's job. See [runtime packs](/runtime/concepts/packs.md).

Related: [primitives](/sdk/concepts/primitives.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Pack contract

[^pack]: definePrimitivePack

[^registration]: Pack registration check
