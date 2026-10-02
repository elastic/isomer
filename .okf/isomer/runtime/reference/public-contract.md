---
type: Reference
title: Public contract
description: The sdk pinned at the same version, required peers, one dual-format entry, Node 22.13.0, no Node built-ins.
tags: [isomer, runtime, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/package.json
    title: Package metadata
  - id: release
    resource: https://github.com/elastic/isomer/blob/main/scripts/semantic_release_workspace.js
    title: Workspace release plugin
---

# Definition

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Publishes as `@elastic/isomer-runtime` with public access, at the workspace's one version.
- Depends on `@elastic/isomer-sdk`: `workspace:*` in the repository, which `pnpm publish` rewrites to the release version, so a published runtime pins the SDK at its own version and the two install together.[^package][^release]
- Peers: `react`, `react-dom` `>=18 <20`, `zod` `^4.4.1`. All required, because the root entry always constructs the `react` and `html` surfaces, and `html` loads `react-dom/server`.
- One entry point, `.`, with `import` and `require` conditions: ESM under `dist/`, CommonJS under `dist/cjs/`, types from `dist/index.d.ts`. The tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`.
- `engines.node` `>=22.13.0`. No Node built-ins, so the package runs in a browser, on a server, or in an edge function.[^package]

Related: [root](/runtime/entry-points/root.md), [SDK public contract](/sdk/reference/public-contract.md).

[^package]: Package metadata

[^release]: Workspace release plugin
