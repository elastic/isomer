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

`createCompositionValidator` is the trusted-input path. `createCompositionParser` is the untrusted path. Both first run `checkInputBudget`, which refuses input nesting past `MAX_INPUT_DEPTH` (64), holding more than `MAX_INPUT_VALUES` (20,000) values or `MAX_INPUT_CHARACTERS` (1,000,000) characters, or containing itself, as one root finding with the code `INPUT_OVER_BUDGET`, and input that is not plain data (an array hole, a prototype other than `Object.prototype` or `null`, a symbol key, an accessor or non-enumerable property, or a function) with `INPUT_NOT_PLAIN_DATA`, so Zod never recurses through it or reads what the walk skipped; what passes is copied as the walk reads it, and the schema parses that copy; `inputBudget` overrides a limit, and `enforceValidationMode` throws that finding even when collecting. `buildCompositionJsonSchema` is the validator's JSON Schema projection. `buildAuthoringJsonSchema` is the smaller walk an agent reads: named shared defs, inlined scalars, and no `id` or `surfaces`.[^spec]

A `ValidationError` is `{ path, message, nodeType?, code? }`; only a finding `checkInputBudget` returns sets `code`. `nodeType` names the innermost primitive node the path lands in, and `formatValidationError` prints `<path> (in <nodeType>) <message>`, or the message alone for a root finding. An unknown key on a node lists that node's declared fields.[^spec]

Related: [primitives](/sdk/concepts/primitives.md), [dispatch](/sdk/concepts/dispatch.md), [pipeline](/sdk/concepts/pipeline.md).

[^spec]: Spec and validation

[^composition]: Composition stage
