---
type: Reference
title: Public contract
description: Private; not published. Depends on the SDK at its own version; react and zod are peers. The runtime and slides pack are test-only dev dependencies. One entry.
tags: [isomer, evals, contract]
status: stable
stale_after: 2027-03-21
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/package.json
    title: Package metadata
---

# Definition

Private and unpublished, depending on the SDK at its own version with `react` and `zod` as peers. See the [package facts](https://github.com/elastic/isomer/blob/main/packages/isomer-evals/docs/index.md#package-facts).

- Private (`"private": true`), so the release workflow never publishes it and no published package may depend on it. License Elastic-2.0. Depends on `@elastic/isomer-sdk`: `workspace:*`. Peers: `react` `>=18 <20` and `zod` `^4.4.1`, which the SDK's root and `./author` entries load. `@elastic/isomer-runtime` and `@elastic/isomer-primitives-slides` (`workspace:*`) are dev dependencies only: only tests import them. `run.test.ts` uses the runtime's `IsomerRuntime` type to prove it satisfies the structural `EvalRuntime`, `runtime.test.ts` exercises invalid model output against a real runtime, and `slides_corpus.test.ts` replays the recorded corpus in `corpus/slides/` against the slides pack. One entry with `import` and `require` conditions, dual ESM/CJS; the tarball carries `dist`, `LICENSE.txt`, `NOTICE.txt`, and `THIRD_PARTY_LICENSES.md`.[^package]

Related: [scoring](/evals/concepts/scoring.md), [root](/evals/entry-points/root.md).

[^package]: Package metadata
