---
navigation_title: Benchmarks
description: Measures what each Isomer package costs to load, run and ship, apart from any host.
---

# Measuring Isomer

`@elastic/isomer-benchmarks` measures what Isomer itself costs, apart from any host. Measuring inside a host shows the cost of the whole stack, with Isomer's share mixed in. These benchmarks load the built packages through their public entries, as a Node host does, and attribute each cost to the package and step that owns it.

## TL;DR

- **Isomer's per-request work is cheap.** A 100-node composition validates in about 0.2 ms, and validating and rendering it as HTML or a snapshot takes about 0.2 to 0.25 ms end to end. Each further node adds about 2 µs, almost all of it validation.
- **Loading code at startup is where the cost is.** The SDK and the runtime with takumi hold about 72 MB RSS before any request, against 42 MB for Node alone. A pack adds its own: about 78 MB with the charts pack and 95 MB with the slides pack.
- **The heaviest single entry is the Elastic Charts engine,** at about 730 CommonJS modules, because it loads `@elastic/charts`. With the SDK and the runtime it reaches about 118 MB. A host that only validates or resolves charts doesn't need it.
- **Subpaths help:** `@elastic/isomer-sdk/text` loads 3 modules against about 150 for the SDK root, and the charts pack's `/scene` and `/resolve` load under 50 against about 320 for its root.
- **Pay one-time costs at startup:** assemble the runtime once (about 2 ms for 10 primitive types, 7 ms for 200) and validate one composition, since the first costs about ten times the rest.
- **Not measured yet:** real pack render cost, takumi rasterizing, chart drawing, concurrency and container limits. Those will likely outweigh everything above.

All figures are medians on one Apple M4 Pro. Expect slower hardware to take longer; memory carries across machines better than time does. [Sizing a host](sizing.md) turns the numbers into guidance, and [Raw results](results.md) holds the tables from the committed baselines.

## What each suite claims

Every scenario runs in its own fresh Node process, started with `--expose-gc --disallow-code-generation-from-strings` and `NODE_ENV=production`, so React and other dependencies load their production builds, as a production host's do. A child inherits the rest of the environment, and the result records `NODE_OPTIONS` when it is set, since a preload changes what a load measures. Each scenario runs several times, and the tables show the median. Peak RSS is the process's high-water mark (`process.resourceUsage().maxRSS`), so it includes Node itself.

| Suite | Claims | Does not claim |
| --- | --- | --- |
| `load` | What `require` of each public entry a host loads costs before any call: time, CommonJS modules loaded, heap held after a GC, and RSS. It covers the SDK's own packages and each [pack config](#benchmarking-a-pack)'s entries. `host:*` rows load what a host needs besides a pack, and each `<pack>:host` row adds that pack to the SDK and the runtime. | What an ESM bundle costs; bundle bytes are a separate measurement. Rows overlap, so they don't add up. ES modules a CommonJS entry loads, which `require.cache` doesn't list. `./testing` entries and the Studio's CLI, which no host loads. For a pack bundled from source, what transpiling it costs. |
| `synthetic` | What the SDK and runtime cost on their own. It uses a generated pack whose renderers each return one element or line, swept one axis at a time: primitive types, nodes (8 label characters each), nesting depth up to 24 levels, and label characters. Every composition uses one of the pack's types, so the primitive axis changes only the pack, and assembling excludes defining the pack. | What a real pack costs. A real pack's schemas and renderers add their own cost on top. Rendering apart from validating: each surface's `render` validates first, so its column includes a validate. Depth past 24 levels. |

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
| `--config <file>` | this repository's packs | A [pack config](#benchmarking-a-pack) to measure, for `load`. Repeat it for several packs. |
| `--runs <n>` | 5 | Fresh processes per scenario, at least 1. |
| `--scenarios <a,b>` | all | Only these scenarios. |
| `--write <file>` | | Also write the full result as JSON: environment, every run, and the summary. |
| `--json` | | Print the JSON instead of the Markdown table. |

`--config` and `--write` paths are relative to the directory you ran the command in, even through `pnpm --filter`. `bench smoke` runs one child of each suite's first and last scenario, to check every suite still runs; `pnpm check:benchmarks` runs it in CI.

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
- `entries` are specifiers, of letters, digits and `@ . / _ -`, resolved from the config's directory, so they load the copies that pack's host would. Each one needs a name no other config or core package uses; a repeated name refuses the run. The first entry is the pack's main one, which its `<name>:host` row loads with the SDK and the runtime, also resolved from there. A pack with no runtime installed beside it gets no host row.
- `build: 'source'` is for a pack whose entries are TypeScript that its host transpiles, such as a Kibana package. Each picked entry is bundled with esbuild to one CommonJS file under the pack's `node_modules/.cache/isomer-benchmarks/<name>/`, then loaded. What resolves to TypeScript is inlined. Everything else stays external at the path Node's `require` resolves from its importer, so it loads the CommonJS build and the copy the host would. Its rows exclude what transpiling would cost. The default, `built`, loads entries as they are.

Then point `load` at it from this repository's root, here with Kibana checked out beside it:

```sh
pnpm --filter @elastic/isomer-benchmarks bench load --config ../kibana/x-pack/platform/packages/shared/isomer/isomer-components/isomer-bench.config.cjs
```

The suite reads a config in the parent process. A child gets only what to load and where to resolve it from, and writes its record on its own file descriptor, so a config's imports stay out of the numbers and what a pack logs stays out of the record. A pack that logs while it loads still pays for that logging in its own rows. The result records each pack's own SDK and runtime versions beside this repository's. The `synthetic` suite measures its own generated pack and takes no `--config`.

This repository's packs keep their configs beside their `isomer-studio.config.ts`. They are the configs the suites use when no `--config` is passed, and the configs the baselines record.

## Refreshing the baselines

`baselines/<suite>.json` holds one full result per suite, with the environment it ran in. [Raw results](results.md) is generated from those files' raw runs and the suites' own descriptions. From this repository's root:

```sh
pnpm --filter @elastic/isomer-benchmarks bench load --write packages/isomer-benchmarks/baselines/load.json
pnpm --filter @elastic/isomer-benchmarks bench report
pnpm docs:assemble
```

Commit the baseline, `docs/results.md`, and the assembled copy under the root `docs/`. `report --check` fails when the page no longer matches the baselines, and `pnpm docs:check` when the assembled copy is stale; `pnpm check:benchmarks` runs the first in `pnpm verify` and in CI. Before you commit a refreshed baseline, explain in the pull request any measure that moved by more than run-to-run noise, and say which environment the numbers came from.

## Bounds

Nothing here gates yet. When a measure gets a bound, the bound is about twice the measured median, as the charts pack's memory bench sets it. That holds across platforms and still catches a doubling. Timing is recorded and never gated.
