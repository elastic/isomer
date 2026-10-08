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
  - id: enhancements
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/pack/enhancements.ts
    title: EnhancementDefinition
---

# Definition

A pack is a vocabulary as a value: `id`, `primitives`, optional `surfaces`, `enhancements`, `slackAssetTypes`, `styleAdapter`, and `styleCollector`. `PackTypes.groups` is the headings `catalog.group` may name: `string` leaves it optional, and a literal union makes it required. `definePrimitivePack` builds one and checks it; its type argument is the palette the pack's frames must supply. Node types must be unique within a pack; `definePrimitivePack` throws `DUPLICATE_PRIMITIVE_TYPE` on a repeat, and `composePacks` reports the cross-pack case. `definePrimitivePack` also throws `UNKNOWN_PRIMITIVE_TYPE` for a `slackAssetTypes` entry the pack does not register, `INVALID_PACK_GROUPS` for a `groupOrder` that does not list each `catalog.group` once or a `groups` list beside either, and `composePacks` throws `DUPLICATE_PACK_ID` for two packs sharing an `id`.[^docs][^pack]

An enhancement's optional `script` is a function body with `root`, the render's `.isomer` section, in scope. It addresses markup through `data-*` attributes, never uses `document.currentScript`, and dispatches host events with `bubbles: true` and `composed: true`. An enhancement the host drives has no `script`, and one that finds nodes declares `anchors: true`. See [rendering](/sdk/concepts/rendering.md) for who runs it.[^docs][^enhancements]

`styleCollector` names the collector shape `collectStyles` hooks mutate. `definePrimitivePack` derives it from `styleAdapter.styleCollector` unless the pack sets it. The SDK ships no adapter for any CSS engine and does not depend on `@elastic/distillate`.

A pack exposes `icons`, each primitive's `icon` by type for the primitives that declare one, and `composePacks` merges them across packs. Both are frozen null-prototype dictionaries, so a type named `__proto__` is an ordinary key and an absent type such as `constructor` reads `undefined`.[^pack]

`definePrimitivePack<T>(input)` returns `PrimitivePack<T>`, whose phantom `__theme` carries the palette its frames must supply. Bare `PrimitivePack` is `PrimitivePack<unknown>`, which asks nothing of a frame; `AnyPrimitivePack` (`PrimitivePack<never>`) is the runtime's storage form.

The registry array and the body-node union are both hand-written. `assertPackRegistrationComplete` fails when a primitives subdirectory is absent from the registry. A directory missing from both lists leaves them agreeing, so it compiles and every other test passes. Deriving the union from the registry does not compile (`TS7022` through the container primitives). `buildJsxShim` already derives the JSX front from the registry value.[^registration]

Composing packs into a runtime is the runtime's job. See [runtime packs](/runtime/concepts/packs.md).

Related: [primitives](/sdk/concepts/primitives.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Pack contract

[^pack]: definePrimitivePack

[^registration]: Pack registration check

[^enhancements]: EnhancementDefinition
