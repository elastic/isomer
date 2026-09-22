---
type: Concept
title: Composition
description: The typed JSON document Isomer validates and renders. Discriminator stays type view.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/composition
tags: [isomer, sdk, composition]
status: stable
stale_after: 2027-03-18
sources:
  - id: spec
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/composition.md
    title: Spec and validation
  - id: composition
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/composition
    title: Composition stage
---

# Definition

A `Composition` is `{ type: 'view', version?: 1, title?, subtitle?, theme?, body: [PrimitiveNode, ...], meta? }`. The wire discriminator stays `'view'`. TypeScript identifiers use `Composition`. Absent `version` means v1. The schema is `.strict()`. `body` must hold at least one node.[^spec]

`resolveVocabulary(definitions)` builds the body-node union. Container members close over a `z.lazy` scoped to this composition so a shared instance cannot freeze on another pack's union. `getCompositionSchemaForDefinitions` memoizes on the identity of the definitions array.[^composition]

`createCompositionValidator` is the trusted-input path. `createCompositionParser` is the untrusted path. `buildCompositionJsonSchema` is the validator's JSON Schema projection. `buildAuthoringJsonSchema` is the smaller walk an agent reads: named shared defs, inlined scalars, and no `id` or `surfaces`.[^spec]

Related: [primitives](/sdk/concepts/primitives.md), [dispatch](/sdk/concepts/dispatch.md), [pipeline](/sdk/concepts/pipeline.md).

[^spec]: Spec and validation

[^composition]: Composition stage
