---
type: Reference
title: Public contract
description: Workspace dependency on the sdk, required peers, one entry, no Node built-ins.
tags: [isomer, runtime, contract]
status: stable
stale_after: 2027-03-18
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/package.json
    title: Package metadata
---

# Definition

- License Elastic-2.0. Depends on `@elastic/isomer-sdk` (`workspace:*`).
- Peers: `react`, `react-dom` `>=18 <20`, `zod` `^4.4.1`. All required, because the root entry always constructs the `react` and `html` surfaces, and `html` loads `react-dom/server`.
- One entry point. No Node built-ins, so the package runs in a browser, on a server, or in an edge function.[^package]

Related: [root](/runtime/entry-points/root.md), [SDK public contract](/sdk/reference/public-contract.md).

[^package]: Package metadata
