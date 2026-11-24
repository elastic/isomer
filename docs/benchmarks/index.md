---
navigation_title: Benchmarks
description: Measures what each Isomer package costs to load, run and ship, apart from any host.
---

# Measuring Isomer

`@elastic/isomer-benchmarks` measures what Isomer itself costs, apart from any host. Measuring inside a host shows the cost of the whole stack, with Isomer's share mixed in. These benchmarks load the built packages through their public entries, as a Node host does, and attribute each cost to the package and step that owns it.

## TL;DR

- **Isomer's per-request work is cheap.** A 100-node composition validates in about 0.2 ms and renders HTML in about 0.25 ms. Each further node adds a few microseconds.
- **Loading code at startup is where the cost is.** The SDK and the runtime with takumi hold about 72 MB RSS before any request, against 42 MB for Node alone. A pack adds its own: about 78 MB with the charts pack and 95 MB with the slides pack.
- **The heaviest single entry is the Elastic Charts engine,** at about 720 modules, because it loads `@elastic/charts`. With the SDK and the runtime it reaches about 115 MB. A host that only validates or resolves charts doesn't need it.
- **Subpaths help:** `@elastic/isomer-sdk/text` loads 3 modules and `/schema` about 110, against about 150 for the SDK root. The charts pack's `/scene` and `/resolve` load under 50.
- **Pay one-time costs at startup:** assemble the runtime once (3 ms for 10 primitive types, 16 ms for 200) and validate one composition (the first costs about ten times the rest).
- **Not measured yet:** real pack render cost, takumi rasterizing, chart drawing, concurrency and container limits. Those will likely outweigh everything above.

All figures are medians on one Apple M4 Pro. Expect slower hardware to take longer; memory carries across machines better than time does. [Sizing a host](sizing.md) turns the numbers into guidance, and [Raw results](results.md) holds the tables from the committed baselines.

## What each suite claims

Every scenario runs in its own fresh Node process, started with `--expose-gc --disallow-code-generation-from-strings` and `NODE_ENV=production`, so React and other dependencies load their production builds, as a production host's do. Each one runs several times, and the tables show the median. Peak RSS is the process's high-water mark (`process.resourceUsage().maxRSS`), so it includes Node itself.

| Suite | Claims | Does not claim |
| --- | --- | --- |
| `load` | What `require` of each public entry costs before any call: time, modules loaded, heap held after a GC, and RSS. It covers the SDK's own packages and each [pack config](#benchmarking-a-pack)'s entries. `host:*` rows load what a host needs besides a pack, and each `<pack>:host` row adds that pack to the SDK and the runtime. | What an ESM bundle costs; bundle bytes are a separate measurement. Rows overlap, so they don't add up. For a pack bundled from source, what transpiling it costs. |
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
| `--config <file>` | this repository's packs | A [pack config](#benchmarking-a-pack) to measure. Repeat it for several packs. |
| `--runs <n>` | 5 | Fresh processes per scenario. |
| `--scenarios <a,b>` | all | Only these scenarios. |
| `--write <file>` | | Also write the full result as JSON: environment, every run, and the summary. |
| `--json` | | Print the JSON instead of the Markdown table. |

## Benchmarking a pack

Any primitive pack can be measured, including one in another repository. Give it an `isomer-bench.config.cjs` in its package directory that names what a host imports:

```js
/** @type {import('@elastic/isomer-benchmarks').BenchConfig} */
module.exports = {
  name: 'components',
  entries: ['@kbn/isomer-components'],
  build: 'source',
};
```

- `name` labels the pack's rows: lowercase letters, digits and dashes.
- `entries` are specifiers, resolved from the config's directory, so they load the copies that pack's host would. The first one is the pack's main entry, which its `<name>:host` row loads with the SDK and the runtime, also resolved from there.
- `build: 'source'` is for a pack whose entries are TypeScript that its host transpiles, such as a Kibana package. Each entry is bundled with esbuild to one CommonJS file under the pack's `node_modules/.cache/isomer-benchmarks/`, keeping everything that resolves to built JavaScript external, and then loaded. Its rows exclude what transpiling would cost. The default, `built`, loads entries as they are.

Then point a suite at it from this repository:

```sh
pnpm --filter @elastic/isomer-benchmarks bench load --config ../kibana/x-pack/platform/packages/shared/isomer/isomer-components/isomer-bench.config.cjs
```

The suites read a config in the parent process. A child gets only what to load and where to resolve it from, so a config that imports the pack never shows up in the numbers. The `synthetic` suite measures its own generated pack and ignores configs.

This repository's packs keep their configs beside their `isomer-studio.config.ts`. They are the configs the suites use when no `--config` is passed, and the configs the baselines record.

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
