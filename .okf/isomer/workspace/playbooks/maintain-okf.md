---
type: Playbook
title: Maintain OKF
description: Keep the Isomer OKF bundle aligned with source, docs, and package metadata.
tags: [isomer, okf, maintenance]
status: stable
stale_after: 2027-03-18
sources:
  - id: agent-instructions
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent maintenance guidance
  - id: okf-workflow
    resource: https://github.com/elastic/isomer/blob/main/.github/workflows/okf.yml
    title: CI enforcement for OKF validity, staleness, indexes, and anchors
  - id: anchor-check
    resource: https://github.com/elastic/isomer/blob/main/scripts/check_okf_anchors.js
    title: Cited path resolution check
  - id: okf-map
    resource: https://github.com/elastic/isomer/blob/main/scripts/write_okf_map.js
    title: Generated docs map of the OKF concept graph
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/package.json
    title: OKF maintenance scripts
---

# Steps

The bundle keeps agent-facing detail the package docs don't cover; where a doc covers a concept, the concept points there instead of restating it. Update a concept when the detail it keeps changes, and run `pnpm okf:check`, as [CONTRIBUTING.md](https://github.com/elastic/isomer/blob/main/CONTRIBUTING.md) and [AGENTS.md](https://github.com/elastic/isomer/blob/main/AGENTS.md) describe.

1. Treat code, tests, examples, and `package.json` as source of truth. Use docs as supporting evidence.
2. Prefer `sources[]` entries that point at the local file proving each implementation claim.
3. Run `pnpm okf:index` and commit any generated index or map changes.

# Accuracy checks

CI installs a pinned OKF CLI, runs `okf validate`, warns on concepts that are past `stale_after`, checks generated index freshness, checks `docs/reference/okf-map.md`, and verifies cited repo paths still exist.

Related: [conventions](/workspace/reference/conventions.md) and [workspace](/workspace/concepts/workspace.md).
