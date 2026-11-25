---
navigation_title: Sizing a host
description: What a host needs to give Isomer, drawn from the benchmark results.
---

# Sizing a host

This page turns the [raw results](results.md) into guidance for a host. Every figure here comes from a committed baseline: the machine and Node version are on the results page. Memory figures carry across machines better than times do. Sections marked pending wait on suites that don't exist yet.

## Loading

A bare Node process holds about 42 MB RSS before it loads anything ([`node`](results.md#loading-each-entry)). Loading Isomer adds to that:

- The SDK and the runtime with takumi, what a server that draws images needs besides a pack, reach about 72 MB RSS with 9 MB of heap held ([`host:image`](results.md#loading-each-entry)). With agent-tools instead of takumi, about 71 MB ([`host:agent`](results.md#loading-each-entry)).
- A pack adds its own. With the SDK and the runtime, the charts pack reaches about 78 MB ([`charts:host`](results.md#loading-each-entry)) and the slides pack about 95 MB ([`slides:host`](results.md#loading-each-entry)). Compare a pack's host row with `host:agent` or `host:image` for what the pack adds.
- The Elastic Charts engine is the heaviest single entry: about 730 CommonJS modules, 17 MB of heap and 97 MB RSS, since it loads `@elastic/charts` with it. Its `./engine` and `./node` entries load as much. With the SDK and the runtime it reaches about 118 MB ([`charts-elastic:host`](results.md#loading-each-entry)). A process that only validates or resolves charts never needs it.

To see what your own pack adds, [benchmark it](index.md#benchmarking-a-pack).

## Importing only what you use

The SDK's root entry loads about 150 modules and bundles to about 185 KB minified for Node. Its subpaths cost less ([Loading each entry](results.md#loading-each-entry), [Bundling each entry](results.md#bundling-each-entry)):

| You need | Import | Loads | Bundles (Node, minified) |
| --- | --- | --- | --- |
| Plain-text rendering | `@elastic/isomer-sdk/text` | 3 modules | under 1 KB |
| A pack's schema helpers (`z`, `requiredString`, URL rules), no React | `@elastic/isomer-sdk/schema` | about 110 modules, 3.8 MB heap, most of it zod | about 2 KB, zod aside |
| Chart contracts for a materializer | `@elastic/isomer-primitives-charts/schema` | about 160 modules | about 125 KB |
| Scene resolution alone | `@elastic/isomer-primitives-charts/resolve` | about 30 modules | about 50 KB |
| The composition validator and parser, and every surface | the SDK root, or the runtime | about 150, or about 220 | about 185 KB, or about 340 KB |

Loading takumi costs little on its own (about 16 modules and 10 ms). Its fonts register on the first draw; see [First draw](#first-draw).

## Bundling

A host that bundles Isomer, such as a render service or a browser app, ships what each entry pulls in besides its peers ([Bundling each entry](results.md#bundling-each-entry)):

- Most of the SDK root's 185 KB isn't the SDK's own code, which is about 40 KB. The rest is the Markdown parser that renders Markdown content (`micromark`, `mdast-util-to-markdown`, and `character-entities` at 35 KB on its own). `./react` and `./slack` pull the parser in too.
- `./html` pulls in `acorn`, about 120 KB, which checks embedded scripts. So does the runtime, which bundles every surface: about 340 KB for Node and about 300 KB for the browser.
- The slides pack bundles to about 545 KB and the charts pack to about 400 KB. Each pack's own code is a little over half of that; the rest is mostly the SDK, the Markdown parser and `@elastic/distillate`.
- The Elastic Charts engine's entries are about 65 KB each, but `@elastic/charts`, their peer, isn't counted. A host that draws with Elastic Charts ships it anyway.
- takumi bundles only for Node, to about 46 KB. Its native renderer is a per-platform binary that the bundle loads at runtime; see [Installing](#installing).

## What a composition costs

What it costs to assemble a runtime and to validate and render a composition, apart from what a pack's own renderers do ([SDK and runtime overhead](results.md#sdk-and-runtime-overhead)):

- **Assembling a runtime** builds the composition schema, so its cost grows with the number of primitive types: about 2 ms and 0.2 MB of heap for 10 types, and about 7 ms and 1.7 MB for 200, apart from defining the pack. Assemble once per process and reuse the runtime.
- **The first validate** costs about ten times the later ones: about 2 ms against 0.2 ms at 10 types and 100 nodes, and about 5 ms at 200 types. Validate one composition at startup if the first request's latency matters.
- **Validation is most of a composition's cost, and it grows with nodes:** about 2 µs per node with 8-character labels, so 4,000 nodes, about 60% of what the SDK's default input budget admits for nodes this small, validate in about 8 ms. Each surface's `render` validates first; past that, HTML adds about 1.3 ms at 4,000 nodes and a snapshot about 1.5 ms. Peak RSS rises about 14 KB per node, to about 145 MB at 4,000. That is the high-water mark of a process rendering them many times over, garbage included, so it overstates what one render holds.
- **Nesting depth** costs almost nothing up to 24 levels, the deepest measured.
- **Text length** costs HTML rendering, which escapes it: 900,000 label characters add about 2 ms. Validation doesn't notice it.

A real pack's renderers cost more than these trivial ones; [Drawing a chart](#drawing-a-chart) has a chart's.

## Drawing a chart

What a server pays to draw charts to PNG with the charts pack, the Elastic Charts engine and takumi, with Inter Latin registered ([Drawing charts](results.md#drawing-charts)):

- **Loading the engine is most of the baseline.** Loaded and with fonts registered, a process holds about 90 MB RSS without an engine and about 133 MB with Elastic Charts. One cold xy chart at 2× is ready about 440 ms after the process starts and peaks at about 180 MB.
- **A small chart is cheap once loaded:** about 5 ms to resolve and draw and 7 ms to rasterize at 1×, for the pack's metric and xy examples.
- **Data size drives memory, and the `snapshot` surface drives time.** One xy line at the charts pack's whole input budget, about 250,000 values, takes about 75 ms to validate, about 870 ms to render as a snapshot, and under 100 ms to rasterize. Resolving its Scene once takes about 340 ms, and with no engine the same snapshot takes about 750 ms, so Elastic Charts itself adds about 120 ms; the rest is the surface's own work around the chart, including validating again. It peaks at about 470 MB, about 340 MB above what loading holds, the request's data included. At a quarter and half of the budget, that peak above loading is about 125 MB and 175 MB.
- **Splitting the same data across a 40-panel grid** peaks lower, at about 420 MB, but takes about 270 ms to rasterize, since the picture holds 40 charts.
- **With no engine,** the pack draws a summary in place of each chart. At the whole budget it still resolves the Scene, so it peaks at about 405 MB, and its snapshot takes about 750 ms.

Size a render process for the largest chart it accepts. The input budget bounds that, and a lower `inputBudget` lowers the peak.

## First draw

Pending: takumi's suite. It will cover font registration on the first draw, PDF worker start-up, and `cacheMaxBytes`.

## Concurrent draws

A burst of 16 small xy PNGs at 2×, requested at once and drawn with the Elastic Charts engine ([Drawing charts](results.md#drawing-charts)):

- Through a limiter of 2, it peaks at about 325 MB, 190 MB above what loading holds. Each PNG takes about 26 ms to rasterize, and all 16 are done in about 360 ms.
- With no limiter, it peaks at about 365 MB, and each PNG takes about 135 ms, since all of them rasterize on the thread pool at once. All 16 are done in about 290 ms, about 70 ms sooner, for about 40 MB more.

A limiter trades a little latency for a lower, bounded peak, so limit draws in flight with the limiter the takumi docs give. To run the bursts:

```sh
pnpm bench charts --scenarios charts-elastic:burst-limited,charts-elastic:burst-unlimited
```

PNG, SVG and measure calls run on the libuv thread pool ([Rendering a PDF](../../isomer-image-takumi/docs/index.md#rendering-a-pdf)), so draws in flight at once each hold their memory at once.

## Containers and heap limits

Pending: the smallest cgroup memory limit and `--max-old-space-size` that a draw succeeds under, including the profile Kibana forks its render process with.

## Installing

Pending: installed size per package, including takumi's per-platform native binary, and the package directories a host's build must keep.
