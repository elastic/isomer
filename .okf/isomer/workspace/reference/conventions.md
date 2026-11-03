---
type: Reference
title: Conventions
description: Brands, errors, barrels, peers, licenses, and pack drawing rules.
tags: [isomer, workspace, conventions]
status: stable
stale_after: 2027-03-18
sources:
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
  - id: module-graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph smoke
---

# Definition

The repository's conventions for commits, license headers, brands, errors, barrels, dependencies, the build, docs and pack drawing are listed in the agent instructions.[^agents]

- `src/entries/*` are hand-curated. `pnpm check:module-graph` fails when `react-dom` or `react-dom/server` is reachable from `.`, `./text`, `./markdown`, `./slack`, or `./author`. Bare `react` is reachable through `render/primitive_dispatch`.[^module-graph]
- `zod` and `react` are peer dependencies. `react-dom` is an optional peer.
- After adding or changing a dependency, run `pnpm licenses:report` and include the updated `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`. Declared runtime optional dependencies need complete license material even when they are not installed on the current platform. The root files cover the whole workspace; each published package's files cover only its own dependencies and those of the workspace packages it depends on.

Related: [verify](/workspace/playbooks/verify.md), [maintain OKF](/workspace/playbooks/maintain-okf.md).

[^agents]: Agent instructions

[^module-graph]: Module graph smoke
