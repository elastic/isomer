---
navigation_title: Evals
description: Scores whether a model produces valid, well-chosen compositions from a pack's authoring context.
---

# Isomer evals

`@elastic/isomer-evals` scores whether a model produces valid, well-chosen compositions from a pack's authoring context. On Node it needs 22.13.0 or later, like the SDK it depends on.

Conformance answers "does this primitive render?" This answers the other half: "does an agent handed the catalog reach for the right one?" Catalog `useWhen` / `avoidWhen` copy is the tunable, and without a measurement it is unfalsifiable.

## Stateless by construction

The library holds no corpus, no goldens, no credentials, and no model client; the recorded corpus under `corpus/` is a test fixture, not part of the build. It reads nothing from the environment and writes nothing to disk. Everything arrives as an argument:

```ts
import { formatReport, runEvals } from '@elastic/isomer-evals';

const report = await runEvals({
  runtime, // your pack's assembled runtime
  corpus, // your prompts, with optional goldens
  generate: async ({ prompt, evalCase, previousErrors }) =>
    callYourModel(
      [
        prompt,
        `## Request\n${evalCase.prompt}`,
        ...(previousErrors
          ? [`## Previous errors\n${previousErrors.join('\n')}`]
          : []),
      ].join('\n\n')
    ),
  concurrency: 4, // cases in flight at once; defaults to 1
});

console.log(formatReport(report));
```

`prompt` contains shared authoring instructions, not the case request or retry feedback. Send `evalCase.prompt` on every attempt and `previousErrors` when present.

`generate` is the only way a model is ever reached. Pass one that replays recorded output and the run is deterministic — which is how this belongs in CI.

`runtime` is an `EvalRuntime`, the slice of a runtime the harness reads (`primitives`, `getAuthoringContext`, `parse`, `validate`, and the `text` surface), declared structurally so a pack can pass a stub; a runtime from `createIsomerRuntime` satisfies it, which `run.test.ts` proves against the runtime's own type.

### Options

| Option | Default | Decides |
| --- | --- | --- |
| `generate` | required | The model call. `attempt` is `0` first and `1` on the retry, when `previousErrors` carries the first attempt's parse error or validation errors. |
| `judge` | none | The answerability call; omitted, the axis is skipped. |
| `profile` | `'general'` | The SDK authoring profile the prompt is built for. |
| `retryOnInvalid` | `true` | Whether a first attempt that did not parse or validate is tried once more. |
| `guide` | a one-sentence guide | The prose the authoring prompt opens with. |
| `rules` | none | The prompt's rules section. |
| `frame` | none | A `validateBody` rule applied to each attempt that validates, as a host's frame would; an attempt it refuses scores invalid and is retried. |
| `concurrency` | `1` | Cases in flight at once; `generate` and `judge` still decide their own rate limits. |

The prompt is one `buildAuthoringPrompt` call over the runtime's authoring context, with no host examples: each catalog entry already shows its own shape.

## The four axes

| Axis | Needs a model | Measures |
| --- | --- | --- |
| Validity | no | Parse and validation pass rate, plus pass-after-one-retry |
| Primitive selection | no | Multiset precision/recall/F1 of every node type in the tree against a golden, and whether any `expected` type appears |
| Payload | no | Raw vs sanitized size, invented node types, golden-relative size |
| Answerability | yes | Whether `runtime.surfaces.text.render(composition)` still answers the prompt |

**Three of the four need no model at all.** A pack can run validity, selection, and payload with no credentials and no flakiness; answerability is opt-in and skipped when `judge` is omitted.

### Why retry is scored separately

A failed attempt is handed its own validation errors and tried once more. The gap between `valid` and `validAfterRetry` measures how actionable the validator's messages are — a property of Isomer, not of the model. A wide gap is a bug report about error copy.

### Why selection is a multiset

Answering a three-stat question with one `statGroup` should score differently from answering it with three separate nodes. A set would score both 1.0.

### Why selection reads the whole tree

Selection counts every node, reached through each primitive's child hook the same way `scoreExpectedPrimitives` and `payload.unknownTypes` reach them, so a data field named `type` is not a node. A pack whose frame wraps every answer in one container, as the slides pack wraps each in a `slideFrame`, puts the choice that matters below the top level; counting only `body[].type` would score whether the model used a frame. The wrapper still counts once on each side, so two answers that share only it score above zero.

## Reading the numbers

`formatReport` prints `EvalReport.totals`; `results[]` carries the per-case scores behind each line.

| Number | Meaning | Better |
| --- | --- | --- |
| `parsed` | Cases whose first attempt was JSON at all, once any code fence is stripped. | Higher |
| `valid` | Cases whose first attempt parsed against the schema and passed validation. | Higher |
| `validAfterRetry` | Cumulative: `valid` plus cases whose retry, handed the first attempt's errors, validated. Never below `valid`. | Higher; a wide gap over `valid` is an error-copy finding, not a model finding |
| `meanSelectionF1` | Mean multiset F1 of every node type in the tree against the golden, over validated cases that have one. `1` is the same primitives in the same counts. | Higher |
| `expectedHits` of `expectedCases` | Cases whose validated composition uses any of the case's `expected` types somewhere in its tree, over cases that list `expected`. A case that never validated is a miss. | Higher |
| `sizeVsGolden` | Per case: sanitized bytes over the golden's bytes, so `1` is the golden's size. | Closer to `1`; well above is verbosity, well below is a thinner answer than the golden |
| `answerability` | Judge verdicts over the `text` rendering, counted as `yes` / `partial` / `no`. Present when a `judge` scored at least one validated case. | More `yes`, fewer `no` |

Per case, `payload.rawBytes` is the model's output as sent and `payload.sanitizedBytes` is the copy `validate` checked, `0` when the first attempt did not validate. `payload.unknownTypes` lists node types the catalog does not have — any entry is either a catalog gap or the model reaching past it. Payload scores describe the first attempt, including when a retry succeeds. If a malformed container makes its child hook throw, its descendants cannot be inspected; scoring continues with the other branches, so an empty `unknownTypes` list does not prove the payload is valid.

### Thresholds

The package ships none. What a pack should score depends on its catalog, its corpus, and the model under test, so record a baseline run first and gate on that. One `expect` per axis, with floors a pack might set after a baseline:

```ts
const { totals, results } = await runEvals({ runtime, corpus, generate, judge });

expect(totals.parsed).toBe(totals.cases);
expect(totals.valid / totals.cases).toBeGreaterThanOrEqual(0.9);
expect(totals.validAfterRetry).toBe(totals.cases);
expect(totals.meanSelectionF1).toBeGreaterThanOrEqual(0.8);
for (const { payload } of results) {
  expect(payload.unknownTypes).toEqual([]);
  expect(payload.sizeVsGolden ?? 1).toBeLessThanOrEqual(1.5);
}
expect(totals.answerability?.no ?? 0).toBe(0);
```

The values are illustrative, not recommended: `0.8` F1 tolerates one substituted primitive in a five-node body, and `1.5` tolerates half again the golden's bytes. A pack replaces them with what its own baseline supports.

## Corpus

An `EvalCase` is an id, a prompt, and optionally the composition a good answer resembles (`golden`) and the node types any one of which a good answer uses (`expected`). Both harnesses take the same `EvalCase`. The node types below are illustrative; a corpus uses the types of the pack under test:

```ts
const corpus = [
  {
    id: 'queue-health',
    prompt: 'How many items are open right now?',
    golden: { type: 'view', title: 'Queue health', body: [{ type: 'stat', … }] },
    expected: ['stat', 'statGroup'],
  },
];
```

A case without a `golden` still scores validity, payload, and answerability — only selection F1 needs one, and only the expected-primitive hit needs `expected`. Selection and answerability run only when the first attempt or retry validates; a case that remains invalid still reports validity and payload scores.

## Recorded slides corpus

`corpus/slides/` replays a small recorded corpus against the in-repo slides pack, so a change to a scorer, the harness, or the pack that moves a score shows up as a diff in review. `src/slides_corpus.test.ts` runs it in the normal `pnpm test`, with no model and no credentials.

| File | Holds |
| --- | --- |
| `corpus.json` | Thirteen requests (comparison, incident timeline, quarterly metrics, release process, customer quote, plan table, roadmap, code, an ambiguous request, one with no data to answer from, one asking for something a slide cannot do, a title slide, an argument), with `expected` primitives and a `golden` for each case that has a clear best answer. |
| `prompt.txt` | The shared authoring prompt `runEvals` builds for the slides runtime with the pack's guide and rules and the `compose-from-primitives` profile. |
| `answers/<id>.<attempt>.txt` | Each attempt's raw output, verbatim, as `generate` returns it. |
| `judgments.json` | One recorded answerability verdict per case, with the `text` rendering it was given. |
| `baseline.json`, `baseline.txt` | The committed report: per-case scores and totals, and `formatReport` output. |

The test fails when the report, the prompt, or the formatted text differs from what is committed. It also records, in `baseline.json`, a hash of the prompt, any attempt the harness asked for that has no recording (`missingRecordings`; the replay hands back an empty answer, which fails to parse), and any case whose text rendering no longer matches the one its verdict was given for (`staleJudgments`; the recorded verdict is still returned). Either list going non-empty means the recordings no longer match the harness and need re-recording.

To accept a change that moves the numbers, regenerate the baseline and commit it with the change, so the diff shows what moved:

```sh
pnpm exec vitest run packages/isomer-evals/src/slides_corpus.test.ts -u
```

### Provenance

The requests, goldens, answers, and verdicts were all written by Claude (model id `claude-opus-5-5`) through Claude Code on 2026-10-29, not by a production model, and are for replay only. Each answer was written from `prompt.txt` followed by `## Request` and the case prompt, the way the example `generate` above assembles it; the one retry also had `## Previous errors` and the first attempt's errors. No answer was edited after it was scored. Because one model wrote the goldens and the answers, selection and expected-primitive scores share its priors: treat the baseline as a regression signal for the scorer and the pack, not as a measurement of any model.

### Replacing it with a production model's output

1. Keep `corpus.json`, or replace its cases; each `id` names its answer files.
2. Run the same `runEvals` options the test passes, with a `generate` that calls the production model and writes each attempt to `answers/<id>.<attempt>.txt` before returning it.
3. Re-judge each validated case from its request and `text` rendering, and record the verdict and the rendering in `judgments.json`.
4. Update the provenance blocks in `corpus.json` and `judgments.json` to name the model, version, date, and any sampling settings.
5. Regenerate the baseline with the command above and commit everything together.

## Scoring functions on their own

The axes are exported individually, so a pack can assert on one without running a corpus. `scoreValidity` is pure: it takes attempts already checked with `checkAttempt`. `scorePrimitiveSelection` and `scoreExpectedPrimitives` read only `runtime.primitives`, to walk the tree; `scorePayload` and `scoreAnswerability` call the runtime you hand them:

```ts
import { scorePrimitiveSelection } from '@elastic/isomer-evals';

expect(scorePrimitiveSelection(runtime, generated, golden).missing).toEqual([]);
```

`checkAttempt(runtime, parseGenerated(raw))` checks the attempt's value once, through the SDK's `checkComposition` — `runEvals` reads that one check for the retry decision, `scoreValidity`, and `scorePayload`. A value that matches the schema but fails a semantic rule (duplicate ids, for instance) therefore never reads as a good composition. `scorePayload` reads the first attempt only, so a retry changes `validity` and not `payload`.

## Agent runs

`runEvals` hands the model the whole catalog in one prompt. An agent instead discovers primitives through tools, and what it spends doing so is the cost to measure. `runAgentEvals` drives that loop: it offers the tools, runs the calls the model makes, and scores the answer the model ends on.

```ts
import { formatAgentReport, runAgentEvals } from '@elastic/isomer-evals';

const report = await runAgentEvals({
  runtime,
  tools, // e.g. createIsomerTools(runtime) from agent-tools
  corpus, // cases with optional `expected` node types
  step: async ({ system, tools, messages }) => callYourModel(system, tools, messages),
  repeat: 3,
});

console.log(formatAgentReport(report));
```

`step` is one model turn, and the only way a model is reached. It receives the system prompt, each tool as `{ name, description, parameters }` with `parameters` as JSON Schema, and the conversation so far, and it returns the turn's text, its tool calls, and the tokens it spent. A turn with no tool calls is the answer. A provider adapter translates `AgentMessage` to its own wire format; the `raw` it returns on an assistant turn is handed back to it verbatim, for providers that need their own content replayed.

A tool is an `AgentEvalTool`: a name, a description, a Zod `inputSchema`, offered to the model as the JSON Schema of the input it accepts, and a `handler` returning text content, the same shape `@elastic/isomer-agent-tools` produces. Input the schema refuses, an unknown tool name, and a throwing handler are each answered to the model as a failed result rather than ending the run.

| Option | Default | Decides |
| --- | --- | --- |
| `step` | required | One model turn. A step that throws ends the run and records the message as `error`. |
| `tools` | required | The tools offered on every turn. |
| `frame` | none | A `validateBody` rule applied to a valid answer, as a host's frame would. |
| `system` | a short instruction to answer with composition JSON | The system prompt. |
| `maxTurns` | `12` | Turns before a run is scored unfinished. |
| `repeat` | `1` | Runs per case; model runs vary, so compare means. |
| `concurrency` | `1` | Runs in flight at once. |

A case's `expected` node types are scored as in `runEvals`: `scoreExpectedPrimitives` counts a hit when any of them appears as a node anywhere in the answer's tree. Unlike `runEvals`, an agent answer that parsed but failed validation is still scored for it. `AgentEvalReport.totals` reports finished and valid runs, expected-primitive hits, and per-run means of turns, input and output tokens, tool-result bytes, and calls to each tool.

## API

| Export | What it is |
| --- | --- |
| `runEvals` | `(options: RunEvalsOptions) => Promise<EvalReport>` |
| `formatReport` | `(report: EvalReport) => string`; returned, never printed |
| `runAgentEvals` | `(options: RunAgentEvalsOptions) => Promise<AgentEvalReport>` |
| `formatAgentReport` | `(report: AgentEvalReport) => string`; returned, never printed |
| `scoreExpectedPrimitives` | `(runtime, value, expected) => ExpectedPrimitivesScore`; reads `runtime.primitives` only |
| `scoreValidity` | `(attempt: CheckedAttempt, retry?: CheckedAttempt) => ValidityScore`; pure |
| `scorePrimitiveSelection` | `(runtime, generated: Composition, golden: Composition) => PrimitiveSelectionScore`; reads `runtime.primitives` only |
| `scorePayload` | `(runtime, attempt: CheckedAttempt, knownTypes, golden?) => PayloadScore` |
| `scoreAnswerability` | `(runtime, judge, evalCase, composition) => Promise<AnswerabilityScore>` |
| `parseGenerated`, `stripCodeFence` | Model output to a `ParsedAttempt`: the JSON parsed once, after any code fence is removed |
| `checkAttempt` | `(runtime, attempt: ParsedAttempt, frame?: EvalFrame) => CheckedAttempt`; a `CheckedAttempt` that parsed carries `check`, the SDK's `CompositionCheck` from checking its value once with `checkComposition`, which applies the frame's body rule to a valid value and whose `errors` `formatValidationError` prints |

Types: `EvalCase`, `EvalCaseResult`, `EvalReport`, `EvalRuntime`, `RunEvalsOptions`, `Generate`, `GenerateRequest`, `Judge`, `JudgeRequest`, `AnswerabilityVerdict`, `EvalFrame`, and the score shapes `ValidityScore`, `PrimitiveSelectionScore`, `ExpectedPrimitivesScore`, `PayloadScore`, `AnswerabilityScore`. Agent runs add `AgentEvalCaseResult`, `AgentEvalCall`, `AgentEvalReport`, `AgentEvalTool`, `AgentMessage`, `AgentStep`, `AgentStepRequest`, `AgentStepResult`, `AgentToolCall`, `AgentToolResult`, `AgentToolSpec`, `AgentUsage`, and `RunAgentEvalsOptions`. `src/api_reference.test.ts` fails when a name exported from `src/index.ts` is missing from this page.

## Package facts

This package is private and not published to npm; it runs from this repository.

It depends on `@elastic/isomer-sdk` at its own version, and `react` and `zod` are required peers, because the SDK's root and `./author` entries load them; a pack's runtime brings both already. One entry point, built as ESM for bundlers and CommonJS, which Node loads. The runtime and the slides pack are development dependencies, for the structural-contract test and the recorded corpus; only tests import them.
