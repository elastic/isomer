---
type: Reference
title: Public contract
description: Private; not published. Depends on the SDK at its own version; react and zod are peers. The runtime is a dev dependency that proves the structural contract. One entry.
tags: [isomer, evals, contract]
status: stable
stale_after: 2027-03-21
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/package.json
    title: Package metadata
---

# Definition

- Private (`"private": true`), so the release workflow never publishes it and no published package may depend on it. License Elastic-2.0. Depends on `@elastic/isomer-sdk`: `workspace:*`. Peers: `react` `>=18 <20` and `zod` `^4.4.1`, which the SDK's root and `./author` entries load. `@elastic/isomer-runtime` (`workspace:*`) is a dev dependency only: nothing under `src/` imports it. `run.test.ts` uses its `IsomerRuntime` type to prove it satisfies the structural `EvalRuntime`, and `runtime.test.ts` exercises invalid model output against a real runtime. One entry with `import` and `require` conditions, dual ESM/CJS; the tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`. `engines.node` `>=22.13.0`.[^package]

Related: [scoring](/evals/concepts/scoring.md), [root](/evals/entry-points/root.md).

[^package]: Package metadata
