# Evals instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- Harness boundaries and dependency ownership: [Stateless by construction](docs/index.md#stateless-by-construction) and [Package facts](docs/index.md#package-facts).
- Scoring: [The four axes](docs/index.md#the-four-axes), [Reading the numbers](docs/index.md#reading-the-numbers), and [Agent runs](docs/index.md#agent-runs). Use their eligibility rules and denominators rather than assuming every metric measures valid output.
- Corpus changes: [Recorded slides corpus](docs/index.md#recorded-slides-corpus) and [Provenance](docs/index.md#provenance).

## When changing this area

State the metric's claim. Invalid input must not earn valid-output credit by mentioning an expected type; diagnostic hits on invalid agent answers are a different claim.

Explain score movement, recording gaps, and stale judgments before updating replay baselines. Derive quality thresholds from an established baseline.

## Evidence required

Cover affected malformed/semantically invalid input, nested nodes, multiplicity, retries, and optional goldens or judgments. Check validity credit separately from selection diagnostics.

Run affected scorer/harness tests and slides replay. Replay scores establish regressions, not model quality.
