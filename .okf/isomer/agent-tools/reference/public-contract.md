---
type: Reference
title: Public contract
description: Private until its API settles. Depends on the SDK alone; the runtime and slides pack are dev dependencies that prove the structural contract. One entry.
tags: [isomer, agent-tools, contract]
status: stable
stale_after: 2027-03-26
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-agent-tools/package.json
    title: Package metadata
---

# Definition

- `private: true`, so it does not publish; removing the flag publishes it with the workspace at one version. License Elastic-2.0. Depends on `@elastic/isomer-sdk` (`workspace:*`); `react` and `zod` are peers. `@elastic/isomer-runtime` and `@elastic/isomer-primitives-slides` are dev dependencies: nothing under `src/` imports them, and `packages/isomer-agent-tools/src/tools/create_tools.test.ts` proves an `IsomerRuntime` satisfies `IsomerToolsRuntime` and an SDK `Frame` satisfies `IsomerToolsFrame`. One entry, `.`. Dual ESM/CJS.[^package]

Related: [agent tools](/agent-tools/concepts/agent-tools.md), [root](/agent-tools/entry-points/root.md).

[^package]: Package metadata
