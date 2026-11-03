---
type: Reference
title: Public contract
description: Elastic-2.0, published as @elastic/isomer-sdk. react and zod are required peers, react-dom optional; eight dual-format entries, Node 22.13.0.
tags: [isomer, sdk, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/package.json
    title: Package metadata and exports
  - id: agents
    resource: https://github.com/elastic/isomer/blob/main/AGENTS.md
    title: Agent instructions
---

# Definition

The package metadata and export contract of `@elastic/isomer-sdk`. See [Package facts](https://github.com/elastic/isomer/blob/main/packages/isomer-sdk/docs/index.md#package-facts) in the package doc.

- Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Publishes as `@elastic/isomer-sdk` with public access, at the workspace's one version. Peers: `react` `>=18 <20` and `zod` `^4.5.4` are required. `react-dom` `>=18 <20` is optional and needed by `./html`.[^package]
- The tarball carries `lib`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`.
- `zod` stays a peer; do not add it to `dependencies`.
- Brands use `Symbol.for`.
- The sdk must not import the runtime.[^agents]

Related: [pipeline](/sdk/concepts/pipeline.md), [root](/sdk/entry-points/root.md).

[^package]: Package metadata and exports

[^agents]: Agent instructions
