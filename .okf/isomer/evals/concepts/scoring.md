---
type: Concept
title: Scoring
description: runEvals scores validity, primitive selection, payload, and answerability. Stateless.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/run.ts
tags: [isomer, evals]
status: stable
stale_after: 2027-03-21
sources:
  - id: run
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/run.ts
    title: runEvals
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/docs/index.md
    title: Package docs
---

# Definition

`runEvals` statelessly scores a corpus for validity, primitive selection, payload, and answerability against a pack's [authoring context](/runtime/concepts/authoring-context.md). See the package doc.[^docs]

Related: [root](/evals/entry-points/root.md), [public contract](/evals/reference/public-contract.md), [score a corpus](/evals/playbooks/score-a-corpus.md), [testing](/sdk/entry-points/testing.md).

[^docs]: Package docs
