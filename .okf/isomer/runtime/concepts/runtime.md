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

`createIsomerRuntime({ packs, frames?, defaultFrame?, views?, rendererOverrides?, styleAdapter?, defaultAriaLabel?, authoring?, inputBudget? })` builds a working runtime, once per process. `packs` is required. `frames` is what makes `surfaces.svg` present, and `defaultFrame` is required past one frame. `views` pre-registers on the view registry. `rendererOverrides` replaces one renderer per type and surface. `styleAdapter` replaces every pack's adapter at once. `defaultAriaLabel` backs the `html` wrapper, and the `react` one with `wrapper`, when a composition has neither `meta.ariaLabel` nor a `title`. `authoring` names pack-owned `$defs`, attaches refine descriptions, or hides a legacy alias on the agent schema. `inputBudget` overrides the SDK's input budget for `parse`, `validate`, view input, and every surface but `react`, which does not validate.[^runtime][^docs]

It returns `packs` (post-override), `primitives` (the flattened inventory), `viewRegistry`, `surfaces`, `validate`, `parse`, `getAuthoringContext`, `getCapabilities`, and `getCompositionSchema`. `validate` runs the input budget, the schema, and the semantic passes on one plain copy and returns it as `composition`, which each validating surface renders in place of its input; `parse` runs the budget and the schema only. It renders nothing itself: primitives and themes come from packs; schema, dispatch, and envelopes come from the SDK.

Construction throws `IsomerError` at host startup, identified by `name` and `code`: `EMPTY_PACKS`; `DUPLICATE_PACK_ID`, `DUPLICATE_PRIMITIVE_TYPE`, or `DUPLICATE_ENHANCEMENT` from `composePacks`; `UNKNOWN_PRIMITIVE_TYPE` or `UNKNOWN_SURFACE` for an override; `EMPTY_FRAMES` for an empty `frames` map, and `UNKNOWN_FRAME` or `AMBIGUOUS_FRAME` for `defaultFrame`; and `MISSING_STYLE_ADAPTER`, `AMBIGUOUS_STYLE_ADAPTER`, or `INCOMPATIBLE_STYLE_COLLECTOR` for CSS.

`TRenderContext` is inferred from `styleAdapter` alone; a host with no adapter and a pack that narrows its context names all three type parameters positionally, `createIsomerRuntime<THostContext, TRenderContext, TTheme>(…)`.[^docs]

Source lives under `assemble/`, `registry/`, and `surfaces/`. Stage barrels there are hand-maintained the same way as the SDK's.

Related: [packs](/runtime/concepts/packs.md), [surfaces](/runtime/concepts/surfaces.md), [create a runtime](/runtime/playbooks/create-a-runtime.md).

[^runtime]: createIsomerRuntime

[^docs]: Runtime
