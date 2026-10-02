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

`runEvals` scores a corpus against a pack's [authoring context](/runtime/concepts/authoring-context.md). The runtime, corpus, goldens, `generate`, and `judge` are arguments. The package reads nothing from the environment and writes nothing to disk.[^run][^docs]

Validity, primitive selection, and payload need no model. Answerability calls `judge` and is skipped when `judge` is omitted. A first attempt that did not parse or validate is handed its parse error or validation errors as `previousErrors` and tried once more, unless `retryOnInvalid` is `false`; the gap between `valid` and `validAfterRetry` is the validator's error copy. Selection compares `body[].type` as a multiset. A case without a golden still scores validity, payload, and answerability. Selection and answerability require a validated first attempt or retry; persistently invalid cases retain validity and payload scores. Payload scores describe the first attempt. Child hooks that throw on malformed containers stop traversal of that branch only; other branches are still inspected. `profile` (default `general`), `guide`, and `rules` shape the one `buildAuthoringPrompt` call every case shares, and `concurrency` (default 1) is how many cases run at once.

`scoreValidity`, `scorePrimitiveSelection`, `scorePayload`, and `scoreAnswerability` are exported on their own. The first two are pure; `scorePayload` and `scoreAnswerability` call the runtime they are handed. `checkAttempt` is where each attempt is parsed and validated, once.

Related: [root](/evals/entry-points/root.md), [public contract](/evals/reference/public-contract.md), [score a corpus](/evals/playbooks/score-a-corpus.md), [testing](/sdk/entry-points/testing.md).

[^run]: runEvals

[^docs]: Package docs
