---
type: Concept
title: Runtime
description: createIsomerRuntime turns packs and frames into a validator, parser, surfaces, and registry.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
tags: [isomer, runtime]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: createIsomerRuntime
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/runtime.md
    title: Runtime
---

# Definition

`createIsomerRuntime({ packs, frames?, styleAdapter?, authoring? })` builds a working runtime. `packs` is required. `authoring` names pack-owned `$defs`, attaches refine descriptions, or hides a legacy alias on the agent schema. It renders nothing itself: primitives and themes come from packs; schema, dispatch, and envelopes come from the SDK.[^runtime][^docs]

`TRenderContext` is inferred from `styleAdapter` alone; a host with no adapter and a pack that narrows its context names all three type parameters positionally, `createIsomerRuntime<THostContext, TRenderContext, TTheme>(…)`.[^docs]

Source lives under `assemble/`, `registry/`, and `surfaces/`. Stage barrels there are hand-maintained the same way as the SDK's.

Related: [packs](/runtime/concepts/packs.md), [surfaces](/runtime/concepts/surfaces.md), [create a runtime](/runtime/playbooks/create-a-runtime.md).

[^runtime]: createIsomerRuntime

[^docs]: Runtime
