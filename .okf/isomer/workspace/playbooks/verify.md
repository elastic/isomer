---
type: Playbook
title: Verify
description: Run the complete local gate with pnpm verify.
tags: [isomer, workspace, verify]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/package.json
    title: verify script
  - id: ci
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/ci.yml
    title: CI verify job
  - id: module-graph
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_module_graph.js
    title: Module graph smoke
  - id: pack-consumer
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_consumer.js
    title: Packed consumer check
  - id: pack-contents
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_pack_contents.js
    title: Pack contents smoke
---

# Steps

1. `corepack enable` and `pnpm install`.
2. Run `pnpm verify`.[^package]
3. If a check fails in a way that looks unrelated to the change, say so rather than papering over it.

`pnpm verify` is typecheck, lint, tests, the dual ESM/CJS build, export parity, export and declaration smokes, pack contents, the module-graph walk, the packed root-import check, and the license report.[^package]

Pack contents checks required legal and docs files, declared `files` entries, export targets, fixture leakage, and relative documentation links inside the tarball. The packed-consumer check imports `@elastic/isomer-sdk` and `@elastic/isomer-runtime` from the packed tarball, ESM and CJS, with required peers installed. The module-graph walk fails when `react-dom` or `react-dom/server` is reachable from `.`, `./text`, `./markdown`, `./slack`, or `./author`.[^pack-contents][^pack-consumer][^module-graph]

CI runs `pnpm verify`, then docs-builder in a second job.[^ci]

Related: [workspace](/workspace/concepts/workspace.md), [docs-builder](/workspace/playbooks/docs-builder.md).

[^package]: verify script

[^ci]: CI verify job

[^module-graph]: Module graph smoke

[^pack-consumer]: Packed consumer check

[^pack-contents]: Pack contents smoke
