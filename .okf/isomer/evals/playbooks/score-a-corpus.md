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

1. Assemble the pack's runtime and build an `EvalCase` list. A `golden` is optional and required only for primitive selection.
2. Call `runEvals({ runtime, corpus, generate })`. `generate` is the only path to a model; a replay function makes the run deterministic.
3. Omit `judge` to skip answerability. Pass `judge` when the `text` surface's rendering should be checked against the prompt.
4. Print with `formatReport`, or call one `score*` function when the corpus is unnecessary.[^docs][^run]

Related: [scoring](/evals/concepts/scoring.md), [authoring context](/runtime/concepts/authoring-context.md).

[^docs]: Package docs

[^run]: runEvals
