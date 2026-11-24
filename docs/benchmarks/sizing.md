---
navigation_title: Sizing a host
description: What a host needs to give Isomer, drawn from the benchmark results.
---

# Sizing a host

This page turns the [results](results.md) into guidance for a host. Every figure here comes from a committed baseline: the machine and Node version are on the results page. Memory figures carry across machines better than times do. Sections marked pending wait on suites that don't exist yet.

## Loading

A bare Node process holds about 42 MB RSS before it loads anything ([`node`](results.md#loading-each-entry)). Loading Isomer adds to that:

- The SDK and the runtime with takumi, what a server that draws images needs besides a pack, reach about 73 MB RSS with 10 MB of heap held ([`host:image`](results.md#loading-each-entry)). With agent-tools instead of takumi, about 72 MB ([`host:agent`](results.md#loading-each-entry)).
- A pack adds its own. With the SDK and the runtime, the charts pack reaches about 78 MB ([`charts:host`](results.md#loading-each-entry)) and the slides pack about 96 MB, since it loads about 640 modules on its own ([`slides:host`](results.md#loading-each-entry)).
- The Elastic Charts engine is the heaviest single entry: about 720 modules, 16 MB of heap and 96 MB RSS, since it loads `@elastic/charts` with it. With the SDK and the runtime it reaches about 115 MB ([`charts-elastic:host`](results.md#loading-each-entry)). A process that only validates or resolves charts never needs it.

To see what your own pack adds, [benchmark it](index.md#benchmarking-a-pack).

## Importing only what you use

The SDK's root entry loads about 150 modules. Its subpaths load less:

| You need | Import | Instead of |
| --- | --- | --- |
| Plain-text rendering | `@elastic/isomer-sdk/text`: 3 modules | the root: about 150 |
| Schemas and validation, no React | `@elastic/isomer-sdk/schema`: about 110 modules, 3.8 MB heap | the root: 7 MB heap |
| Chart contracts for a materializer | `@elastic/isomer-primitives-charts/schema`: about 160 modules | the pack root: about 320 |
| Scene resolution alone | `@elastic/isomer-primitives-charts/resolve`: about 30 modules | the pack root |

Loading takumi costs little on its own (about 16 modules and 10 ms). Its fonts register on the first draw; see [First draw](#first-draw).

## What a composition costs

What it costs to assemble a runtime and to validate and render a composition, apart from what a pack's own renderers do ([SDK and runtime overhead](results.md#sdk-and-runtime-overhead)):

- **Assembling a runtime** builds the composition schema, so its cost grows with the number of primitive types: about 3 ms and 0.5 MB of heap for 10 types, and about 17 ms and 4 MB for 200. Assemble once per process and reuse the runtime.
- **Nodes** are what a composition's cost grows with. Each node adds about 1 µs to validate, 3 µs to render HTML and 2.5 µs to render a snapshot. 4,000 nodes, about 60% of what the SDK's default input budget admits for nodes this small, validate in about 5 ms and render HTML in about 12 ms. The suite's peak RSS for 4,000 nodes, near 180 MB, is the high-water mark of a process rendering them many times over, not what one render needs.
- **Nesting depth** costs almost nothing up to the input budget's depth limit.
- **Text length** costs HTML rendering, which escapes it: 900,000 label characters add about 2 ms. Validation doesn't notice it.

A real pack's renderers cost more than these trivial ones. For a chart, the engine and the rasterizer dominate.

## First draw

Pending: takumi's suite. It will cover font registration on the first draw, PDF worker start-up, and `cacheMaxBytes`.

## Concurrent draws

Pending: per-draw memory under load, and the limiter settings that keep it bounded. Until then, `pnpm bench:charts` measures a burst of chart PNGs with and without a limiter. PNG, SVG and measure calls run on the libuv thread pool ([Rendering a PDF](../image-takumi/index.md#rendering-a-pdf)), so draws in flight at once each hold their memory at once.

## Containers and heap limits

Pending: the smallest cgroup memory limit and `--max-old-space-size` that a draw succeeds under, including the profile Kibana forks its render process with.

## Installing

Pending: installed size per package, including takumi's per-platform native binary, and the package directories a host's build must keep.
