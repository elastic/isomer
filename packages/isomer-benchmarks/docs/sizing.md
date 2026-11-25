---
navigation_title: Sizing a host
description: What a host needs to give Isomer, drawn from the benchmark results.
---

# Sizing a host

This page turns the [raw results](results.md) into guidance for a host. Every figure here comes from a committed baseline: the machine and Node version are on the results page. Memory figures carry across machines better than times do. Sections marked pending wait on suites that don't exist yet.

## Loading

A bare Node process holds about 42 MB RSS before it loads anything ([`node`](results.md#loading-each-entry)). Loading Isomer adds to that:

- The SDK and the runtime with takumi, what a server that draws images needs besides a pack, reach about 72 MB RSS with 9 MB of heap held ([`host:image`](results.md#loading-each-entry)). With agent-tools instead of takumi, about 71 MB ([`host:agent`](results.md#loading-each-entry)).
- A pack adds its own. With the SDK and the runtime, the charts pack reaches about 78 MB ([`charts:host`](results.md#loading-each-entry)) and the slides pack about 95 MB ([`slides:host`](results.md#loading-each-entry)). Compare a pack's host row with the [`@elastic/isomer-runtime`](results.md#loading-each-entry) row, about 71 MB, for what the pack adds: loading the runtime loads the SDK's root entry with it.
- The Elastic Charts engine is the heaviest single entry: about 730 CommonJS modules, 17 MB of heap and 97 MB RSS, since it loads `@elastic/charts` with it. Its `./engine` and `./node` entries load as much. With the SDK and the runtime it reaches about 118 MB ([`charts-elastic:host`](results.md#loading-each-entry)). A process that only validates or resolves charts never needs it.

To see what your own pack adds, [benchmark it](index.md#benchmarking-a-pack).

## Importing only what you use

The SDK's root entry loads about 150 modules. Its subpaths load less:

| You need | Import | Instead of |
| --- | --- | --- |
| Plain-text rendering | `@elastic/isomer-sdk/text`: 3 modules | the root: about 150 |
| A pack's schema helpers (`z`, `requiredString`, URL rules), no React | `@elastic/isomer-sdk/schema`: about 110 modules, 3.8 MB heap | the root: about 150 modules, 7 MB heap. The composition validator and parser are only on the root and the runtime. |
| Chart contracts for a materializer | `@elastic/isomer-primitives-charts/schema`: about 160 modules | the pack root: about 320 |
| Scene resolution alone | `@elastic/isomer-primitives-charts/resolve`: about 30 modules | the pack root |

Loading takumi costs little on its own (about 16 modules and 10 ms). Its fonts register on the first draw; see [First draw](#first-draw).

## What a composition costs

What it costs to assemble a runtime and to validate and render a composition, apart from what a pack's own renderers do ([SDK and runtime overhead](results.md#sdk-and-runtime-overhead)):

- **Assembling a runtime** builds the composition schema, so its cost grows with the number of primitive types: about 2 ms and 0.2 MB of heap for 10 types, and about 7 ms and 1.7 MB for 200, apart from defining the pack. Assemble once per process and reuse the runtime.
- **The first validate** costs about ten times the later ones: about 2 ms against 0.2 ms at 10 types and 100 nodes, and about 5 ms at 200 types. Validate one composition at startup if the first request's latency matters.
- **Validation is most of a composition's cost, and it grows with nodes:** about 2 µs per node with 8-character labels, so 4,000 nodes, about 60% of what the SDK's default input budget admits for nodes this small, validate in about 8 ms. Each surface's `render` validates first, so the render columns are end to end: at 4,000 nodes, about 9.6 ms for HTML, 7.2 ms for text and 9.7 ms for a snapshot. Each column is its own timing loop with its own warm-up, and text comes out below validating alone, so don't subtract one column from another. Peak RSS rises about 14 KB per node, to about 145 MB at 4,000. That is the high-water mark of a process rendering them many times over, garbage included, so it overstates what one render holds.
- **Nesting depth** costs almost nothing up to 24 levels, the deepest measured.
- **Text length** costs HTML rendering, which escapes it: 900,000 label characters add about 2 ms. Validation doesn't notice it.

A real pack's renderers cost more than these trivial ones. For a chart, the engine and the rasterizer dominate.

## First draw

Pending: takumi's suite. It will cover font registration on the first draw, PDF worker start-up, and `cacheMaxBytes`.

## Concurrent draws

Pending: per-draw memory under load, and the limiter settings that keep it bounded. Until then, the charts pack's memory bench measures a burst of 16 chart PNGs with and without a limiter of 2, drawn with the Elastic Charts engine:

```sh
pnpm bench:charts --engine packages/isomer-charts-elastic/bench/engine.cjs --scenarios burst-limited,burst-unlimited
```

PNG, SVG and measure calls run on the libuv thread pool ([Rendering a PDF](../../isomer-image-takumi/docs/index.md#rendering-a-pdf)), so draws in flight at once each hold their memory at once.

## Containers and heap limits

Pending: the smallest cgroup memory limit and `--max-old-space-size` that a draw succeeds under, including the profile Kibana forks its render process with.

## Installing

Pending: installed size per package, including takumi's per-platform native binary, and the package directories a host's build must keep.
