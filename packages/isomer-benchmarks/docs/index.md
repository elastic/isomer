---
navigation_title: Benchmarks
description: Measures what each Isomer package costs to load, run and ship, apart from any host.
---

# Measuring Isomer

`@elastic/isomer-benchmarks` measures what Isomer itself costs, apart from any host. Measuring inside a host shows the cost of the whole stack, with Isomer's share mixed in. These benchmarks load the built packages through their public entries, as a Node host does, and attribute each cost to the package and step that owns it.

[Results](results.md) holds the numbers from the committed baselines. [Sizing a host](sizing.md) turns them into guidance.

## What each suite claims

Every scenario runs in its own fresh Node process, started with `--expose-gc --disallow-code-generation-from-strings`. Each one runs several times, and the tables show the median. Peak RSS is the process's high-water mark (`process.resourceUsage().maxRSS`), so it includes Node itself.

| Suite | Claims | Does not claim |
| --- | --- | --- |
| `load` | What `require` of each public entry costs before any call: time, modules loaded, heap held after a GC, and RSS. Two `host:*` rows load what a typical host loads together. | What an ESM bundle costs; bundle bytes are a separate measurement. Rows overlap, so they don't add up. |
| `synthetic` | What the SDK and runtime cost on their own. It uses a generated pack whose renderers each return one element or line, swept one axis at a time: primitive types, nodes, nesting depth and label characters. | What a real pack costs. A real pack's schemas and renderers add their own cost on top. |

Times measure the machine they ran on. Compare them within one environment, never across environments. Memory moves less between machines, but still differs by platform and allocator.

## Running a suite

Build first, because the suites load the built CommonJS packages:

```sh
pnpm build
pnpm --filter @elastic/isomer-benchmarks bench load
pnpm --filter @elastic/isomer-benchmarks bench synthetic --runs 3 --scenarios nodes-10,nodes-4000
```

| Option | Default | |
| --- | --- | --- |
| `--runs <n>` | 5 | Fresh processes per scenario. |
| `--scenarios <a,b>` | all | Only these scenarios. |
| `--write <file>` | | Also write the full result as JSON: environment, every run, and the summary. |
| `--json` | | Print the JSON instead of the Markdown table. |

## Refreshing the baselines

`baselines/<suite>.json` holds one full result per suite, with the environment it ran in. [Results](results.md) is generated from those files and the suites' own descriptions:

```sh
pnpm --filter @elastic/isomer-benchmarks bench load --write baselines/load.json
pnpm --filter @elastic/isomer-benchmarks bench report
pnpm --filter @elastic/isomer-benchmarks bench report --check
```

`report --check` fails when the page no longer matches the baselines; `pnpm check:benchmarks` runs it in `pnpm verify` and in CI. Before you commit a refreshed baseline, explain in the pull request any measure that moved by more than run-to-run noise, and say which environment the numbers came from.

## Bounds

Nothing here gates yet. When a measure gets a bound, the bound is about twice the measured median, as the charts pack's memory bench sets it. That holds across platforms and still catches a doubling. Timing is recorded and never gated.
