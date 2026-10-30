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

The SDK pinned at the same version, required peers, Node 22.13.0, and no Node built-ins on the root entry. See the [package facts](https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/index.md#package-facts).

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Publishes as `@elastic/isomer-runtime` with public access, at the workspace's one version.
- Depends on `@elastic/isomer-sdk`: `workspace:*` in the repository, which `pnpm publish` rewrites to the release version, so a published runtime pins the SDK at its own version and the two install together.[^package][^release]
- Two entry points, each with `import` and `require` conditions: `.` (ESM under `dist/`, CommonJS under `dist/cjs/`, types from `dist/index.d.ts`) and `./testing`, the conformance harness factory for pack tests. The tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`.
- No Node built-ins on `.`, so the package runs in a browser, on a server, or in an edge function; `./testing` is Node-only.[^package]

Related: [root](/runtime/entry-points/root.md), [SDK public contract](/sdk/reference/public-contract.md).

[^package]: Package metadata

[^release]: Workspace release plugin
