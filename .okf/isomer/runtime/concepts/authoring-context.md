---
type: Concept
title: Authoring context
description: getAuthoringContext returns the authoring schema, catalog, and live views.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/authoring.ts
tags: [isomer, runtime, authoring]
status: stable
stale_after: 2027-03-18
sources:
  - id: authoring
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/authoring.ts
    title: Runtime authoring
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/authoring-context.md
    title: Authoring context
  - id: authoring-schema
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/validate/authoring_schema.ts
    title: Authoring JSON Schema projection
---

# Definition

`getAuthoringContext()` returns `{ schema, primitives, views, schemaFor }`. `schema` is [`buildAuthoringJsonSchema`](/sdk/concepts/composition.md): named shared defs, inlined scalars, no `id` or `surfaces`. `primitives` is one catalog entry per primitive, including its `example`. `views` is read on every call, because a host may register views after boot; each summary is projected once at `register`, so the read is cheap. Extra compositions belong on the prompt; catalog examples live on `primitives`. Schema and catalog are cached for the runtime's lifetime.[^authoring][^docs][^authoring-schema]

Pass `authoring` on `createIsomerRuntime` to name pack-owned `$defs`, attach refine descriptions, or hide a legacy alias. `parse` still validates with `buildCompositionJsonSchema`. Pack prose comes from the SDK [authoring](/sdk/concepts/authoring.md) helpers.

Related: [SDK authoring](/sdk/concepts/authoring.md), [view registry](/runtime/concepts/view-registry.md), [scoring](/evals/concepts/scoring.md).

[^authoring]: Runtime authoring

[^docs]: Authoring context

[^authoring-schema]: Authoring JSON Schema projection
