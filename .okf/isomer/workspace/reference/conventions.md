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

- Conventional commits. `feat:` and `fix:` are release-driving.
- License headers are the Elastic License 2.0 block, enforced by ESLint (`license-header/header`). Use `pnpm lint:fix` rather than inserting them by hand. `.yml`/`.yaml` headers are hand-maintained.
- Brands use `Symbol.for`, never bare `Symbol()`.
- `IsomerError` is identified by `name` and `code`, never `instanceof`. `CompositionValidationError` is identified by `name`, `code`, and `errors`.
- Stage barrels (`packages/isomer-sdk/src/<stage>/index.ts`) are hand-maintained. TypeScript enforces correctness; keep them alphabetically sorted.
- `src/entries/*` are hand-curated. `pnpm check:module-graph` fails when `react-dom` or `react-dom/server` is reachable from `.`, `./text`, `./markdown`, `./slack`, or `./author`. Bare `react` is reachable through `render/primitive_dispatch`.[^module-graph]
- `zod` and `react` are peer dependencies. Do not add `zod` to `dependencies`. `react-dom` is an optional peer.
- The sdk must not import the runtime.
- No cross-package tsconfig `paths`. Internal resolution is `workspace:*` plus TypeScript project references.
- Do not invent a bundler. `tsc` plus `tsc-alias`, with a second `tsc` pass for CommonJS.
- After adding or changing a dependency, run `pnpm licenses:report` and include the updated `THIRD_PARTY_LICENSES.md` and `NOTICE.txt`. Declared runtime optional dependencies need complete license material even when they are not installed on the current platform.
- Narrative docs live in each package's `docs/`. Root `docs/` is the docs-builder assembler; do not author package pages there.
- A pack holds no rendered value of its own: every number, length, ratio, and glyph it draws has one authoring source in its theme.
- There is no per-primitive `svg` renderer. The image surface dispatches to `react` and is handed the pack's stylesheet.
- The pack stylesheet does not reach inside an inline `<svg>`. Anything drawn there needs a literal `fill` / `stroke` alongside its class.[^agents]

Related: [verify](/workspace/playbooks/verify.md), [maintain OKF](/workspace/playbooks/maintain-okf.md).

[^agents]: Agent instructions

[^module-graph]: Module graph smoke
