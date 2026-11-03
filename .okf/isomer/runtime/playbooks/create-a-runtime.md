---
type: Playbook
title: Create a runtime
description: Install the runtime and SDK, then pass packs and an optional frame map to createIsomerRuntime.
tags: [isomer, runtime, playbook]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/quick-start.md
    title: Quick start
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: createIsomerRuntime
---

# Steps

Install the runtime and SDK with their peers, then pass packs and an optional frame map to `createIsomerRuntime` once, at module scope. See the package quick start.[^docs]

Related: [runtime](/runtime/concepts/runtime.md), [define a pack](/sdk/playbooks/define-a-pack.md).

[^docs]: Quick start
