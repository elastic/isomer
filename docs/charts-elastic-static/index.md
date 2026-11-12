---
navigation_title: Static Elastic Charts
description: A SceneRenderer that draws chart Scenes with released Elastic Charts on Node, in jsdom with Skia canvases, for images and PDF.
---

# Static Elastic Charts

`@elastic/isomer-charts-elastic-static` draws [chart Scenes](../charts/scene.md) on Node with released Elastic Charts: the [browser engine](../charts-elastic/index.md)'s own `<Chart>`, mounted in a jsdom window whose canvases draw through Skia (`@napi-rs/canvas`). The chart's markup goes inline into static markup, each canvas as a PNG of its drawing and Elastic Charts' stylesheet beside it, so the `snapshot` surface carries it to an image backend such as takumi for PNG and PDF. It is a `SceneRenderer` for the `metric`, `xy` and `partition` kinds, and needs no unreleased Elastic Charts.

```ts
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { createElasticChartsStaticRenderer } from '@elastic/isomer-charts-elastic-static';

const imagePack = createChartsPack({
  sceneRenderers: [
    createElasticChartsStaticRenderer({
      fonts: [{ family: 'Inter', path: interRegular }],
    }),
  ],
});
```

`createElasticChartsStaticRenderer` is a `sized` `SceneRenderer`. It runs on `node`; pass `environments` to add `browser` where markup is static. Register it in the pack's `sceneRenderers`, since `snapshot` takes no host context. It draws at the Scene's `size`: a grid panel's box, the host's `size`, or the chart's [size spec](../charts/rendering.md#chart-size).

| Option | Effect |
| --- | --- |
| `fonts` | Font files registered with Skia before the first drawing, so canvas text measures and draws in them. Absent: Skia's own faces |
| `pixelRatio` | Device pixels per CSS pixel in each canvas's image. Absent: 2 |

`drawScene(scene, options?)` returns `{ html, width, height, debugState? }`: Elastic Charts' markup with its canvases as images, and the `DebugState` it reports. `elasticChartsSheet(scheme)` is the stylesheet each drawing carries: Elastic Charts' own for the scheme, over EUI's global reset and body font scoped to the chart, as Kibana's page gives it.

The drawing is a `role="img"` named by the Scene's `title` (`aria-label`) and described by its summary, then its description when the node states one (`aria-description`).

## On Node

Each draw installs the jsdom window's globals (`window`, `document`, `ResizeObserver` and the rest) and restores what was there after, so the host keeps no DOM globals and the charts pack still sees Node. The window is made once per process. jsdom has no layout, so Elastic Charts learns its size from a `ResizeObserver` that reports the chart's inline size, and `requestAnimationFrame` frames run when the draw flushes.

Nothing reaches jsdom's selector engine, which compiles selectors with `new Function` and fails under `--disallow-code-generation-from-strings`, as packaged Kibana runs: `getComputedStyle` returns an element's inline style, and the engine walks parents and finds elements by class.

Drawing is synchronous and blocks the thread for each chart, so a host draws in a process or worker that does nothing else. Skia's pixels live outside V8's heap, so each canvas is shrunk to one pixel once its image is taken.

takumi cannot lay out two things Elastic Charts' markup carries, so the drawing rewrites them to what a browser computes: `min-content` grid rows and `auto-fill` and `auto-fit` grid tracks (as many tracks as fit the chart's width). jsdom's style serializer drops a closing parenthesis from the metric grid's nested `repeat(…, minmax(…))`, which the drawing restores.

## Measuring it

`pnpm --filter @elastic/isomer-charts-elastic-static bench` runs the root benchmark harness, `scripts/bench_charts.cjs`, with this engine (`scripts/bench_engine.cjs`); see the harness for its scenarios and options. `bench:check` (`pnpm check:memory` from the root) holds each bounded scenario's median of three runs to its ceiling there.

Measured on macOS arm64, Node 22, MB:

| Scenario | Peak RSS | Peak less loaded | Heap after GC | Draw per chart |
| --- | --- | --- | --- | --- |
| `engine` (42 charts) | 315–327 | 98–109 | 58 | 29–30 ms |
| `one` | 243–244 | 25–26 | 53 | 100–105 ms |
| `burst-limited` (16 at 2×) | 342–354 | 125–136 | 57 | 37–38 ms |
| `budget-grid` | 802–810 | 576–581 | 64 | 2.5 s |
| `budget-xy` | 1074–1079 | 846–851 | 146 | 3.4 s |

Loaded, with jsdom, Skia and the fonts, is about 217 MB.

## Known gaps

What the [browser engine's tolerance table](../charts-elastic/index.md#known-gaps-and-geometry-tolerance) lists holds here too: this is the same engine. Drawn on Node, these differ besides:

| Kind | Gap |
| --- | --- |
| metric | Where a title wraps, jsdom has no layout and Skia's font metrics break it at other words, so the [look gate](#parity-gates) holds it to 0.5 |
| all | Axis text and series are pixels in a canvas's image: they cannot be selected in a PDF, and scale as a bitmap |

## Parity gates

- **Content** (`src/parity.test.ts`): each drawing passes the charts pack's [static renderer checks](../charts/rendering.md#testing-a-static-renderer) and the Elastic Charts engine's [`DebugState` checks](../charts-elastic/index.md#testing-a-static-drawing). Metric tiles, legends and an empty chart's note are HTML, read as drawn; axis text and series paint are inside canvas images, so the reader takes them from the `DebugState` Elastic Charts reports, which is weaker evidence than text in the markup.
- **Look** (`e2e/look.spec.ts`, run by `pnpm test:browser` after `pnpm build`), the Elastic Charts engine's `defineLookSuite`: the browser engine's drawing of each Scene scores at least 0.75 against this one's for xy and partition, 0.7 for metric and 0.5 for a wrapped title, and below that against the drawings of the known-unlike pairs. Measured on macOS, the same Scene scored at least 0.978 for xy, 0.990 for partition, a median 1.000 for metric and 0.51 for the wrapped title, and the pairs at most 0.425. `LOOK_SCORES=<file>` records every score.
