---
type: Playbook
title: Score an agent loop
description: Pass a runtime, tools, a corpus, and a step function to runAgentEvals.
tags: [isomer, evals, agent-tools, playbook]
status: stable
stale_after: 2027-04-11
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/docs/index.md
    title: Package docs
  - id: run
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/agent_run.ts
    title: runAgentEvals
---

# Steps

Pass a runtime, tools, a corpus, and a `step` function to `runAgentEvals`, then print with `formatAgentReport`. See the package doc's agent runs section.[^docs]

Related: [score a corpus](/evals/playbooks/score-a-corpus.md), [scoring](/evals/concepts/scoring.md).

[^docs]: Package docs
