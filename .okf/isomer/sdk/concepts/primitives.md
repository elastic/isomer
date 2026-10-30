---
type: Concept
title: Primitives
description: definePrimitive binds schema, catalog, examples, and per-surface renderers into one definition.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
tags: [isomer, sdk, primitives]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/primitives.md
    title: Primitive contract
  - id: define
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/define
    title: define stage
---

# Definition

`definePrimitive` is the primitive contract, binding a node's zod schema, catalog entry, examples, per-surface renderers, and optional hooks and icon into one definition. See the package doc on the primitive contract.[^docs]

A primitive holds no theme literals of its own; those belong to the pack's theme.

Related: [packs](/sdk/concepts/packs.md), [define a primitive](/sdk/playbooks/define-a-primitive.md), [rendering](/sdk/concepts/rendering.md).

[^docs]: Primitive contract
