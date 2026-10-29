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

A pack is a vocabulary as a value, built and checked by `definePrimitivePack`, with its `styleCollector` derived from its style adapter unless overridden. See the package doc on the pack contract.[^docs]

`definePrimitivePack` throws `UNKNOWN_PRIMITIVE_TYPE` for a group naming an unregistered type, `DUPLICATE_PRIMITIVE_TYPE` for a type in two groups, and `INVALID_PACK_GROUPS` for a title used twice or titled `UNCATEGORIZED_GROUP_TITLE` (`'Uncategorized'`), the heading the index lists ungrouped types under.[^pack]

The SDK ships no adapter for any CSS engine and does not depend on `@elastic/distillate`.

A pack exposes `icons`, each primitive's `icon` by type for the primitives that declare one, and `composePacks` merges them across packs. Both are frozen null-prototype dictionaries, so a type named `__proto__` is an ordinary key and an absent type such as `constructor` reads `undefined`.[^pack]

Composing packs into a runtime is the runtime's job. See [runtime packs](/runtime/concepts/packs.md).

Related: [primitives](/sdk/concepts/primitives.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Pack contract

[^pack]: definePrimitivePack
