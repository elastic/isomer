---
type: Reference
title: Public contract
description: Published harness depending on the SDK. The runtime is a dev dependency for contract and integration tests. One entry.
tags: [isomer, evals, contract]
status: stable
stale_after: 2027-03-21
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/package.json
    title: Package metadata
---

# Definition

- Published with the workspace at one version, as a pack-side harness. License Elastic-2.0. Depends on `@elastic/isomer-sdk` (`workspace:*`). `@elastic/isomer-runtime` (`workspace:*`) is a dev dependency only: production code does not import it; tests verify the structural `EvalRuntime` contract and exercise invalid model output against a real runtime. One entry. Dual ESM/CJS.[^package]

Related: [scoring](/evals/concepts/scoring.md), [root](/evals/entry-points/root.md).

[^package]: Package metadata
