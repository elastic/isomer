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
  - id: validation
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/validate/validation.ts
    title: Validation
---

# Definition

A `Composition` is `{ type: 'view', version?: 1, title?, subtitle?, theme?, body: [PrimitiveNode, ...], meta? }`. The wire discriminator stays `'view'`. TypeScript identifiers use `Composition`. Absent `version` means v1. The schema is `.strict()`. `body` must hold at least one node.[^spec]

`resolveVocabulary(definitions)` builds the body-node union. Container members close over a `z.lazy` scoped to this composition so a shared instance cannot freeze on another pack's union. `getCompositionSchemaForDefinitions` memoizes on the identity of the definitions array.[^composition]

`createCompositionValidator` is the trusted-input path. `createCompositionParser` is the untrusted path. `buildCompositionJsonSchema` is the validator's JSON Schema projection. `buildAuthoringJsonSchema` is the smaller walk an agent reads: named shared defs, inlined scalars, and no `id` or `surfaces`.[^spec]

Every validation error is `{ path, message, nodeType? }`. `path` locates the value and quotes a key that is not a plain name (`meta["a b"]`), `nodeType` names the primitive the path lands in, and `formatValidationError` prints `<path> (in <nodeType>) <message>`. A misspelled enum or discriminator value is answered with the closest option (`did you mean "slideBars"?`) and an unknown key on a node with the fields it takes; echoed input is quoted as one-line JSON, so a message never starts a new line.[^spec]

`parse` and `validate` bound the work untrusted input can cause. Input nested deeper than 64 levels of arrays and objects, or holding more than 20,000 values, fails with one root error before the schema runs, and `validate` marks that result `refused`; `enforceValidationMode` throws a `refused` result in either mode, since no render can take it. A result lists at most 50 errors, and a last root error counts the rest. The limits are `MAX_COMPOSITION_DEPTH`, `MAX_COMPOSITION_VALUES`, and `MAX_VALIDATION_ERRORS` in `validate/validation.ts`, not exports.[^validation]

Related: [primitives](/sdk/concepts/primitives.md), [dispatch](/sdk/concepts/dispatch.md), [pipeline](/sdk/concepts/pipeline.md).

[^spec]: Spec and validation

[^composition]: Composition stage

[^validation]: Validation
