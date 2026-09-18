---
type: Playbook
title: Create a runtime
description: Pass packs and an optional frame map to createIsomerRuntime.
tags: [isomer, runtime, playbook]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/quick-start.md
    title: Quick start
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: createIsomerRuntime
---

# Steps

1. Import packs built with `definePrimitivePack`.
2. Call `createIsomerRuntime({ packs, frames })` if image output needs a document. Pass `authoring` when the agent schema needs named `$defs`, refine descriptions, or a hidden legacy alias.
3. `runtime.validate(composition)` on trusted input; parse on untrusted.
4. Render with `runtime.surfaces.<name>.render(composition)`.[^docs][^runtime]

Related: [runtime](/runtime/concepts/runtime.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Quick start

[^runtime]: createIsomerRuntime
