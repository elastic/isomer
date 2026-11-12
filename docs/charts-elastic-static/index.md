---
navigation_title: Static Elastic Charts
description: A SceneRenderer that draws chart Scenes on Node with Elastic Charts' SVG renderer (#2941) in jsdom, for images and PDF.
---

# Static Elastic Charts

`@elastic/isomer-charts-elastic-static` draws [chart Scenes](../charts/scene.md) on Node with the [browser engine](../charts-elastic/index.md)'s own `<Chart>`, switched to Elastic Charts' SVG renderer (`renderer="svg"`) and mounted in a jsdom window. The chart's markup goes inline into static markup, SVG for what Elastic Charts draws on a canvas in a browser and HTML for metric tiles and legends, with Elastic Charts' stylesheet beside it, so the `snapshot` surface carries it to an image backend such as takumi for PNG and PDF. It is a `SceneRenderer` for the `metric`, `xy` and `partition` kinds, and needs no native addon.

It needs a release of Elastic Charts with the SVG renderer ([elastic/elastic-charts#2941](https://github.com/elastic/elastic-charts/pull/2941), merged at `c830c3bc`). Until one ships, it depends on a build of that commit in its own `vendor/`, and stays private. The browser engine draws with whatever `@elastic/charts` its host installs; this package injects it (`dependenciesMeta.injected`), so its copy builds its specs from the same Elastic Charts whose `<Chart>` collects them.

While the two install different builds of Elastic Charts, a process loads one or the other: the injected copy registers the browser engine's style modules again, and Distillate refuses a second registration. A host draws in the browser with the browser engine and on its server with this one, so neither process needs both.

```ts
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { createElasticChartsStaticRenderer } from '@elastic/isomer-charts-elastic-static';

const imagePack = createChartsPack({
  sceneRenderers: [createElasticChartsStaticRenderer({ measureTextWidth })],
});
```

`createElasticChartsStaticRenderer` is a `sized` `SceneRenderer`. It runs on `node`; pass `environments` to add `browser` where markup is static. Register it in the pack's `sceneRenderers`, since `snapshot` takes no host context. It draws at the Scene's `size`: a grid panel's box, the host's `size`, or the chart's [size spec](../charts/rendering.md#chart-size).

| Option | Effect |
| --- | --- |
| `measureTextWidth` | `(text, font) => width`, which Elastic Charts lays text out with. Absent: `measureHelvetica`, Helvetica's advance widths. Pass one backed by the image backend's fonts so labels fit as they are drawn |

`drawScene(scene, options?)` returns `{ html, width, height, debugState? }`: Elastic Charts' markup, and the `DebugState` it reports. `elasticChartsSheet(scheme)` is the stylesheet each drawing carries: Elastic Charts' own for the scheme, over EUI's global reset and body font scoped to the chart, as Kibana's page gives it.

The drawing is a `role="img"` named by the Scene's `title` (`aria-label`) and described by its summary, then its description when the node states one (`aria-description`). Each drawing's ids, and the references to them, are prefixed by a hash of the drawing, so several charts inline in one page keep their own clip paths.

## On Node

Each draw installs the jsdom window's globals (`window`, `document`, `ResizeObserver` and the rest) and restores what was there after, so the host keeps no DOM globals and the charts pack still sees Node. The window is made once per process. jsdom has no layout, so Elastic Charts learns its size from a `ResizeObserver` that reports the chart's inline size, and `requestAnimationFrame` frames run until Elastic Charts reports the chart drawn; a chart that does not finish throws. A canvas's 2D context measures text and draws nothing.

Nothing reaches jsdom's selector engine, which compiles selectors with `new Function` and fails under `--disallow-code-generation-from-strings`, as packaged Kibana runs: `getComputedStyle` returns an element's inline style, and the engine walks parents and finds elements by class.

Drawing is synchronous and blocks the thread for each chart, so a host draws in a process or worker that does nothing else.

takumi cannot lay out two things Elastic Charts' markup carries, so the drawing rewrites them to what a browser computes: `min-content` grid rows and `auto-fill` and `auto-fit` grid tracks (as many tracks as fit the chart's width). jsdom's style serializer drops a closing parenthesis from the metric grid's nested `repeat(…, minmax(…))`, which the drawing restores.

## Measuring it

`pnpm --filter @elastic/isomer-charts-elastic-static bench` runs the root benchmark harness, `scripts/bench_charts.cjs`, with this engine (`scripts/bench_engine.cjs`); see the harness for its scenarios and options. `bench:check` (`pnpm check:memory` from the root) holds each bounded scenario's median of three runs to its ceiling there.

Measured on macOS arm64, Node 22, MB:

| Scenario | Peak RSS | Peak less loaded | Heap after GC | Draw per chart |
| --- | --- | --- | --- | --- |
| `engine` (42 charts) | 267–289 | 109–132 | 62 | 13–14 ms |
| `one` | 179–183 | 24 | 57 | 84–85 ms |
| `burst-limited` (16 at 2×) | 302–318 | 146–159 | 61 | 19–20 ms |
| `budget-grid` | 699–744 | 532–576 | 68 | 2.0 s |
| `budget-xy` | 1122–1260 | 954–1091 | 149 | 3.2 s |

Loaded, with jsdom and the fonts, is about 157 MB.

## Known gaps

What the [browser engine's tolerance table](../charts-elastic/index.md#known-gaps-and-geometry-tolerance) lists holds here too: this is the same engine. Drawn on Node, these differ besides:

| Kind | Gap |
| --- | --- |
| all | Text is laid out with `measureTextWidth` and drawn in the image backend's fonts; where the two disagree, labels can overlap or clip |
| metric | Where a title wraps, jsdom has no layout and breaks it at other words, so the [look gate](#parity-gates) holds it to 0.5 |
| metric | A trend's `aria-labelledby` joins its title and description ids with `_`, so it names no element; Elastic Charts' markup, kept as drawn |

## Parity gates

- **Content** (`src/parity.test.ts`): each drawing passes the charts pack's [static renderer checks](../charts/rendering.md#testing-a-static-renderer) and the Elastic Charts engine's [`DebugState` checks](../charts-elastic/index.md#testing-a-static-drawing), read from the markup as drawn: text from the SVG and HTML, paint from the SVG's `fill` and `stroke`. Every tick label Elastic Charts reports must also be SVG text.
- **Ids** (`src/svg.test.ts`): every id reference in a drawing that resolved before its ids were prefixed still resolves.
- **Look** (`e2e/look.spec.ts`, run by `pnpm test:browser` after `pnpm build`), the Elastic Charts engine's `defineLookSuite`: the browser engine's drawing of each Scene scores at least 0.75 against this one's for xy and partition, 0.7 for metric and 0.5 for a wrapped title, and below that against the drawings of the known-unlike pairs. Both sides draw with the vendored build. Measured on macOS, the same Scene scored at least 0.800 for xy, 0.919 for partition, a median 1.000 for metric and 0.51 for the wrapped title, and the pairs at most 0.425. `LOOK_SCORES=<file>` records every score.
