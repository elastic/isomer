---
type: Entry Point
title: Root
description: '@elastic/isomer-evals runEvals, formatReport, and the four score functions.'
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/index.ts
tags: [isomer, evals, api]
status: stable
stale_after: 2027-03-21
sources:
  - id: barrel
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-evals/src/index.ts
    title: Root barrel
---

# Definition

One entry. Values: `runEvals`, `formatReport`, `parseGenerated`, `stripCodeFence`, `checkComposition`, `checkAttempt`, and `scoreValidity`, `scorePrimitiveSelection`, `scorePayload`, `scoreAnswerability`. Types: `EvalCase`, `EvalCaseResult`, `EvalReport`, `EvalRuntime` (the structural runtime slice), `RunEvalsOptions`, `Generate` and `GenerateRequest`, `Judge` and `JudgeRequest`, `AnswerabilityVerdict`, the four score shapes, and `ParsedAttempt`, `CheckedAttempt`, and `CheckedComposition`. `src/api_reference.test.ts` fails when the package page misses an export.[^barrel]

Related: [scoring](/evals/concepts/scoring.md), [public contract](/evals/reference/public-contract.md).

[^barrel]: Root barrel
