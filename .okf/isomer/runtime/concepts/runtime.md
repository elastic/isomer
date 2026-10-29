---
type: Concept
title: Runtime
description: createIsomerRuntime turns packs and frames into a validator, parser, surfaces, and registry.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
tags: [isomer, runtime]
status: stable
stale_after: 2027-03-18
sources:
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: createIsomerRuntime
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/runtime.md
    title: Runtime
---

# Definition

`createIsomerRuntime` turns packs and frames into a validator, parser, surfaces, and view registry, once per process. See the package doc on the runtime.[^docs]

Source lives under `assemble/`, `registry/`, and `surfaces/`. Stage barrels there are hand-maintained the same way as the SDK's.[^runtime]

Related: [packs](/runtime/concepts/packs.md), [surfaces](/runtime/concepts/surfaces.md), [create a runtime](/runtime/playbooks/create-a-runtime.md).

[^runtime]: createIsomerRuntime

[^docs]: Runtime
