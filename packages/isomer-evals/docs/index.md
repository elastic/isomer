---
navigation_title: Evals
description: Scores whether a model produces valid, well-chosen compositions from a pack's authoring context.
---

# Isomer evals

`@elastic/isomer-evals` scores whether a model produces valid, well-chosen compositions from a pack's authoring context.

Conformance answers "does this primitive render?" This answers the other half: "does an agent handed the catalog reach for the right one?" Catalog `useWhen` / `avoidWhen` copy is the tunable, and without a measurement it is unfalsifiable.

## Stateless by construction

The package holds no corpus, no goldens, no credentials, and no model client. It reads nothing from the environment and writes nothing to disk. Everything arrives as an argument:

```ts
import { formatReport, runEvals } from '@elastic/isomer-evals';

const report = await runEvals({
  runtime,                        // your pack's assembled runtime
  corpus,                         // your prompts, with optional goldens
  generate: async ({ prompt }) => callYourModel(prompt),
  concurrency: 4,                 // cases in flight at once; defaults to 1
});

console.log(formatReport(report));
```

`generate` is the only way a model is ever reached. Pass one that replays recorded output and the run is deterministic — which is how this belongs in CI.

## The four axes

| Axis | Needs a model | Measures |
| --- | --- | --- |
| Validity | no | Parse and validation pass rate, plus pass-after-one-retry |
| Primitive selection | no | Multiset precision/recall/F1 of `body[].type` against a golden |
| Payload | no | Raw vs sanitized size, invented node types, golden-relative size |
| Answerability | yes | Whether `runtime.surfaces.text.render(composition)` still answers the prompt |

**Three of the four need no model at all.** A pack can run validity, selection, and payload with no credentials and no flakiness; answerability is opt-in and skipped when `judge` is omitted.

### Why retry is scored separately

A failed attempt is handed its own validation errors and tried once more. The gap between `valid` and `validAfterRetry` measures how actionable the validator's messages are — a property of Isomer, not of the model. A wide gap is a bug report about error copy.

### Why selection is a multiset

Answering a three-stat question with one `statGroup` should score differently from answering it with three separate nodes. A set would score both 1.0.

## Reading the numbers

`formatReport` prints `EvalReport.totals`; `results[]` carries the per-case scores behind each line.

| Number | Meaning | Better |
| --- | --- | --- |
| `parsed` | Cases whose first attempt was JSON at all, once any code fence is stripped. | Higher |
| `valid` | Cases whose first attempt parsed against the schema and passed validation. | Higher |
| `validAfterRetry` | Cumulative: `valid` plus cases whose retry, handed the first attempt's errors, validated. Never below `valid`. | Higher; a wide gap over `valid` is an error-copy finding, not a model finding |
| `meanSelectionF1` | Mean multiset F1 of `body[].type` against the golden, over cases that have one. `1` is the same primitives in the same counts. | Higher |
| `sizeVsGolden` | Per case: sanitized bytes over the golden's bytes, so `1` is the golden's size. | Closer to `1`; well above is verbosity, well below is a thinner answer than the golden |
| `answerability` | Judge verdicts over the `text` rendering, counted as `yes` / `partial` / `no`. Present only when a `judge` was supplied. | More `yes`, fewer `no` |

Per case, `payload.rawBytes` is the model's output as sent and `payload.sanitizedBytes` is what survived parsing; the gap is invented properties the schema dropped. `payload.unknownTypes` lists node types the catalog does not have — any entry is either a catalog gap or the model reaching past it.

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

An `EvalCase` is an id, a prompt, and optionally the composition a good answer resembles. The node types below are illustrative; a corpus uses the types of the pack under test:

```ts
const corpus = [
  {
    id: 'queue-health',
    prompt: 'How many items are open right now?',
    golden: { type: 'view', title: 'Queue health', body: [{ type: 'stat', … }] },
  },
];
```

A case without a `golden` still scores validity, payload, and answerability — only selection needs one.

## Scoring functions on their own

The axes are exported individually, so a pack can assert on one without running a corpus. `scorePrimitiveSelection` and `scoreValidity` are pure: the first takes two compositions, the second takes attempts already checked with `checkAttempt`. `scorePayload` and `scoreAnswerability` call the runtime you hand them:

```ts
import { scorePrimitiveSelection } from '@elastic/isomer-evals';

expect(scorePrimitiveSelection(generated, golden).missing).toEqual([]);
```

`checkAttempt(runtime, parseGenerated(raw))` parses the attempt's value against the runtime's schema and then validates the result, once per attempt — `runEvals` reads that one check for the retry decision, `scoreValidity`, and `scorePayload`. A value that parses but fails a semantic rule (duplicate ids, for instance) therefore never reads as a good composition.
