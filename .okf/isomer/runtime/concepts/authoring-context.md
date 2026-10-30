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

`getAuthoringContext()` returns the authoring schema, catalog, live view summaries, and the per-type lookups a host hands an agent. See the package doc on the authoring context.[^docs]

`authoring: { jsx: true }` adds the JSX props types and components `buildJsxShim` builds, since the runtime cannot see whether a host builds a shim.[^authoring]

`parse` still validates with `buildCompositionJsonSchema`.[^authoring-schema]

Related: [SDK authoring](/sdk/concepts/authoring.md), [view registry](/runtime/concepts/view-registry.md), [scoring](/evals/concepts/scoring.md).

[^authoring]: Runtime authoring

[^docs]: Authoring context

[^authoring-schema]: Authoring JSON Schema projection
