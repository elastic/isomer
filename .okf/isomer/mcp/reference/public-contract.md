---
type: Reference
title: Public contract
description: Depends on the SDK and the MCP SDK. The runtime and slides pack are dev dependencies that prove the structural contract. Two entries.
tags: [isomer, mcp, contract]
status: stable
stale_after: 2027-03-23
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-mcp/package.json
    title: Package metadata
---

# Definition

- Published with the workspace at one version. License Elastic-2.0. Depends on `@elastic/isomer-sdk` (`workspace:*`) and `@modelcontextprotocol/sdk`; `react` and `zod` are peers. `@elastic/isomer-runtime` and `@elastic/isomer-primitives-slides` are dev dependencies: nothing under `src/` imports them, and `packages/isomer-mcp/src/tools/create_tools.test.ts` proves an `IsomerRuntime` satisfies `IsomerToolsRuntime` and an SDK `Frame` satisfies `IsomerToolsFrame`. Two entries, `.` and `./tools`. Dual ESM/CJS.[^package]

Related: [agent tools](/mcp/concepts/agent-tools.md), [root](/mcp/entry-points/root.md), [tools](/mcp/entry-points/tools.md).

[^package]: Package metadata
