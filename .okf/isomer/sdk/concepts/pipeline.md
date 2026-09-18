---
type: Concept
title: Pipeline
description: Imports flow composition to define to pack to validate to render. The sdk must not import the runtime.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries
tags: [isomer, sdk, pipeline]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
  - id: entries
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/src/entries
    title: Hand-curated entries
  - id: module-graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph smoke
  - id: eslint
    resource: https://github.com/elastic/isomer/blob/main/eslint.config.js
    title: Stage-boundary lint rules
---

# Definition

Stage barrels are hand-maintained. Imports flow `composition/` → `define/` → `pack/` → `validate/` → `render/`. `author/` and `testing/` may import any stage; stages must not import fronts. ESLint enforces the boundary and forbids the sdk importing the runtime.[^agents][^eslint]

`src/entries/*` choose which names reach which subpath. `pnpm check:module-graph` walks the built ESM graph from each declared entry and fails when a forbidden specifier is reachable. `react-dom` and `react-dom/server` must stay unreachable from `.`, `./text`, `./markdown`, `./slack`, and `./author`. Bare `react` is reachable through `render/primitive_dispatch`.[^entries][^module-graph]

Related: [root entry](/sdk/entry-points/root.md), [public contract](/sdk/reference/public-contract.md).

[^agents]: Agent instructions

[^entries]: Hand-curated entries

[^module-graph]: Module graph smoke

[^eslint]: Stage-boundary lint rules
