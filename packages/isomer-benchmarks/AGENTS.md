# Benchmarks instructions

Read the [root instructions](../../AGENTS.md) first.

## Read before changing

- What each suite claims and doesn't: [What each suite claims](docs/index.md#what-each-suite-claims).
- Baselines and the generated results page: [Refreshing the baselines](docs/index.md#refreshing-the-baselines).
- Host guidance drawn from the numbers: [Sizing a host](docs/sizing.md).

## When changing this area

Measure through public entries of the built packages only, in a fresh child per run. A suite that imports source, or reuses a process across runs, measures something else.

A suite reads pack configs in the parent and hands each child a JSON spec; never load a config in a child. Keep suites pack-agnostic: what a pack needs belongs in its config, not in a suite.

Yield or use fresh inputs between iterations wherever a package caches per task or by identity (the charts scene cache, the runtime's authoring context), or warm numbers are cache hits.

`docs/results.md` is generated: change the suite or the baseline, then run `bench report`. Explain any measure that moved beyond run-to-run noise before committing a refreshed baseline, and name the environment it came from. Never refresh one suite's baseline on a different machine from the others without saying so.

Set a bound in `bounds/<suite>.json` at about twice the measured median. A memory bound comes from numbers on the CI host; a size bound from any machine. Never gate timing.

## Evidence required

Run the affected suite at least twice and confirm the medians agree within noise. Run `bench report --check`, and the package's unit tests for anything in `src/`.
