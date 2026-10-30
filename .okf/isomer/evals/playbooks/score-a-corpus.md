---
type: Playbook
title: Score a corpus
description: Pass a runtime, a corpus, and a generate function to runEvals.
tags: [isomer, evals, playbook]
status: stable
stale_after: 2027-03-21
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/docs/index.md
    title: Package docs
  - id: run
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/run.ts
    title: runEvals
---

# Steps

Pass a runtime, a corpus, and a `generate` function to `runEvals`, then print with `formatReport`. See the package doc.[^docs]

Related: [scoring](/evals/concepts/scoring.md), [authoring context](/runtime/concepts/authoring-context.md).

[^docs]: Package docs
