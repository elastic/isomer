---
type: Reference
title: Public contract
description: Source-available Elastic-2.0. react and zod are required peers. react-dom is optional.
tags: [isomer, sdk, contract]
status: stable
stale_after: 2027-03-18
generated: { by: cursor/grok-4.7, at: 2026-09-22T00:50:00Z }
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/package.json
    title: Package metadata and exports
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
---

# Definition

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Peers: `react` `>=18 <20` and `zod` `^4.4.1` are required. `react-dom` `>=18 <20` is optional and needed by `./html`.[^package]
- Entries: `.` · `./html` · `./text` · `./markdown` · `./slack` · `./react` · `./author` · `./testing`.
- Dual ESM/CJS. `zod` stays a peer; do not add it to `dependencies`.
- Brands use `Symbol.for`. Identify `IsomerError` by `name` and `code`; identify `CompositionValidationError` by `name`, `code`, and `errors`.
- The sdk must not import the runtime.[^agents]

Related: [pipeline](/sdk/concepts/pipeline.md), [root](/sdk/entry-points/root.md).

[^package]: Package metadata and exports

[^agents]: Agent instructions
