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

1. Build the tools to measure, such as `createIsomerTools(runtime)` from agent-tools; each is a name, a description, a Zod `inputSchema`, and a `handler` returning text content.
2. Build an `AgentEvalCase` list. `expected` lists node types a good answer uses; a run hits when any appears anywhere in its tree.
3. Write `step`, one model turn: translate the system prompt, the tools' JSON Schema `parameters`, and the `AgentMessage` history to a provider's wire format, and return the turn's text, tool calls, and token usage. Return the provider's own content as `raw` when it must be replayed.
4. Call `runAgentEvals({ runtime, tools, corpus, step, repeat })`, passing `frame` when the host applies a frame rule, and print with `formatAgentReport`. Compare two tool builds by running the same corpus and `step` against each.[^docs][^run]

Related: [score a corpus](/evals/playbooks/score-a-corpus.md), [scoring](/evals/concepts/scoring.md).

[^docs]: Package docs

[^run]: runAgentEvals
