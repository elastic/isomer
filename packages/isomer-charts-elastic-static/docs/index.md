---
navigation_title: Static Elastic Charts
description: A SceneRenderer that draws chart Scenes as static SVG with Elastic Charts, on Node or in static markup, for images and PDF.
---

# Static Elastic Charts

`@elastic/isomer-charts-elastic-static` draws [chart Scenes](../../isomer-primitives-charts/docs/scene.md) as SVG with Elastic Charts' headless renderer, from the same specs as the [browser engine](../../isomer-charts-elastic/docs/index.md), with no DOM, worker or canvas addon. The SVG goes inline into static markup, so the `snapshot` surface carries it to an image backend such as takumi for PNG and PDF. It is a `SceneRenderer` for the `metric`, `xy` and `partition` kinds.

It needs a release of Elastic Charts with headless SVG output ([elastic/elastic-charts#2939](https://github.com/elastic/elastic-charts/pull/2939)), here rebased onto the SVG renderer ([elastic/elastic-charts#2941](https://github.com/elastic/elastic-charts/pull/2941)), which moved Elastic Charts' renderers onto a painter. Until both ship, it depends on a build of that rebase in its own `vendor/`, and stays private. The browser engine draws with whatever `@elastic/charts` its host installs; this package injects it (`dependenciesMeta.injected`), so its copy builds its specs from the same Elastic Charts that collects them.

While the two install different builds of Elastic Charts, a process loads one or the other: the injected copy registers the browser engine's style modules again, and Distillate refuses a second registration. A host draws in the browser with the browser engine and on its server with this one, so neither process needs both.

```ts
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { createElasticChartsStaticRenderer } from '@elastic/isomer-charts-elastic-static';

const imagePack = createChartsPack({
  sceneRenderers: [createElasticChartsStaticRenderer({ font })],
});
```

`createElasticChartsStaticRenderer` is a `sized` `SceneRenderer`. It runs on `node`; pass `environments` to add `browser` where markup is static, such as a preview of the `html` or `snapshot` surface. It puts the chart's SVG inline in a `div`. Register it in the pack's `sceneRenderers`, since `snapshot` takes no host context. It draws at the Scene's `size`. Being `sized`, it gets a Scene with one wherever it draws: a grid panel's box, the host's `size`, or the chart's [size spec](../../isomer-primitives-charts/docs/rendering.md#chart-size). Its box takes classes from the charts pack's distillery (`chartsElasticStatic-*`); a host that draws the `react` surface itself ships `elasticChartsStaticStylesheet()` beside the pack's `chartsStylesheet()`.

`renderSceneSvg(scene, options?)` returns `{ svg, width, height, debugState? }`. Options choose how text is drawn:

| Option             | Text                                                              |
| ------------------ | ----------------------------------------------------------------- |
| `font`             | Glyph outlines of this font, the same wherever the chart is drawn |
| `measureTextWidth` | SVG `<text>`, laid out with this measure                          |
| neither            | SVG `<text>`, laid out with Elastic Charts' Helvetica metrics     |

The SVG is a `role="img"` named by the Scene's `title` as its `<title>` and described by its `summary`, then its `description` when the node states one, as its `<desc>`, as `Settings` takes them in a browser. `debugState` is what `<Chart debugState>` reports; the vendored build returns it through a patch offered on #2939. Metric has no DebugState in Elastic Charts, so a metric is checked by the text in its SVG.

Metrics drawn here differ from the browser's: values draw smaller and words can break mid-word. Those gaps are Elastic Charts', reported on #2939.

## In the Studio

`pnpm --filter @elastic/isomer-charts-elastic-static studio` opens the charts as a render service would draw them. The Studio's Node server draws each chart with this renderer and rasterizes it with takumi to PNG and PDF, with Inter as the image font. `studio:check` renders every example on every surface, PNG included.

Its previews are static markup, which a live `<Chart>` can't draw into, so the browser draws with this renderer too. In a browser, the renderer scales its SVG to the container at the drawing's aspect ratio, never past the size it was drawn at, so a grid laid out fluidly still fits. Each SVG's ids are prefixed by a hash of the drawing, so several charts inline in one page keep their own clip paths. A host drawing in a browser passes `measureTextWidth`, backed by a canvas, so text is laid out as the browser will draw it.

## Measuring it

`pnpm --filter @elastic/isomer-charts-elastic-static bench` runs the root benchmark harness, `scripts/bench_charts.cjs`, with this engine (`scripts/bench_engine.cjs`): what a render service pays to draw charts, through validation, the `snapshot` surface, this renderer and takumi to PNG, on one shared backend with Inter Latin registered once. Each run is a fresh Node process loading the CommonJS build, so run `pnpm build` first. Scenarios:

| Scenario | What it draws |
| --- | --- |
| `baseline` | Every `metric` and `xyChart` example, light and dark, at 1×, with no chart engine (the pack's summary fallback) |
| `engine` | The same, with this renderer; the difference from `baseline` is the engine's |
| `one` | One xy chart at 2×: the one-off PNG |
| `budget-xy` | One xy line at the charts pack's whole input budget (250,000 values, about 83,000 points), at 2× |
| `budget-grid` | 40 xy panels in a `grid` sharing that budget, the dashboard the budget was sized for, at 2× |
| `burst-limited` | 16 xy charts at 2× requested at once, through the [limiter in takumi's docs](../../isomer-image-takumi/docs/index.md#memory-on-a-small-server), of 2 |
| `burst-unlimited` | The same 16 with no limiter |

Each reports peak RSS; RSS once everything is loaded and the fonts registered; peak less loaded, which is what rendering adds; heap held after the run and a forced GC; cold start to the first PNG; the median validate-and-draw and rasterization time per chart; and the largest PNG. `--scenarios a,b` picks scenarios, `--runs n` sets runs per scenario, `--repeat <n>` draws a scenario's charts n times in one process, `--values <n>` replaces the input budget the `budget-*` scenarios fill, `--cache-max-bytes <n>` sets takumi's resource cache, and `--json` prints every run, as one JSON document even with `--check`, which then reports its bounds on stderr. A held heap that stays flat as `--repeat` grows rules out a JavaScript leak, but not native growth: takumi and its buffers allocate outside the heap, and peak RSS is only a high-water mark.

`pnpm --filter @elastic/isomer-charts-elastic-static bench:check` (`pnpm check:memory` from the root, part of `pnpm verify` and CI) runs `engine`, `one`, both `budget-*` scenarios and `burst-limited` three times each, and fails when a scenario's median peak RSS or peak less loaded is over its bound in `scripts/bench_engine.cjs`. A bound is about 1.5× the largest of what macOS arm64, Linux arm64 and Linux x64 (emulated on arm64) measured on Node 24, so a runner's variance passes and a doubling fails. The median of three runs, rather than the largest, keeps one slow garbage collection from failing a build. Lower a bound when a change makes rendering cheaper, so the gain is kept.

Measured on Node 24 with #2939 alone, MB:

| Scenario                   | Peak RSS, macOS arm64 | Peak RSS, Linux arm64 | Peak RSS, Linux x64 (emulated) | Peak less loaded, Linux arm64 | Validate and draw, Linux arm64 |
| -------------------------- | --------------------- | --------------------- | ------------------------------ | ----------------------------- | ------------------------------ |
| `one`                      | 148–150               | 149                   | 196–197                        | 16                            | 35–43 ms                       |
| `engine` (42 charts)       | 177–182               | 238–240               | 298                            | 105–107                       | 5 ms each                      |
| `burst-limited` (16 at 2×) | 198–201               | 257–270               | 308–329                        | 124–137                       | 9–18 ms each                   |
| `budget-grid`              | 492–505               | 567–577               | 630–635                        | 428–437                       | 1.9–2.3 s                      |
| `budget-xy`                | 836–988               | 991–1065              | 1052–1092                      | 852–926                       | 3.3–3.8 s                      |

With #2939 rebased onto #2941, macOS arm64 on Node 22 measured within those: peak RSS 185–187 MB for `engine` (49–52 MB over loaded, 4 ms a chart), 153–154 for `one`, 206 for `burst-limited`, 486–493 for `budget-grid` and 819–820 for `budget-xy`, loaded at about 135 MB.

Loaded RSS is about 130 MB on arm64, of which this renderer and its Elastic Charts build are about 48 MB, and about 170 MB under x64 emulation, which adds its own overhead; the emulated column bounds what CI's x64 runners may see rather than measuring them. Inter Latin at four weights is about 1 MB. Linux pays more than macOS for the same work, so read the Linux column for a server.

What a one-off chart PNG costs is small: about 16 MB over loaded for a typical xy chart, and 15 to 40 ms. What it costs grows with the data drawn: on Linux, about 185 MB over loaded at 25,000 input values, 250 MB at 50,000 and 900 MB at 250,000. The charts pack's input budget, sized for a 40-panel dashboard, admits a single chart whose render needs around 900 MB on Linux, which does not fit beside Kibana on a 1 GB instance. Two things make the large case expensive:

- Through the `snapshot` surface, the charts pack resolves each chart's Scene five times: once for the frame's height estimate, then twice in each of its two React passes (styles, then markup), unsized and then at the chart's box. The engine draws the SVG twice. At 83,000 points, a resolve takes about 550 ms and builds a Scene of about 22 MB as JSON: 13 MB of layers, 5 MB of formatted `table` and 3 MB of categories. A host can pass `createChartsPack` a `resolveScene` memoized on the node and its options, and a renderer memoized on the Scene; measured on macOS, that took `budget-xy` from 836–988 MB to 665 MB and its draw from 3.2–4.1 s to 1.9 s.
- Elastic Charts' headless renderer keeps the selector state of its last two charts after drawing: about 130 MB of heap after a 40,000-point chart, released as later charts replace it. It is bounded, not a leak.

So a PNG host on a small instance sets a lower input budget of its own (`createIsomerRuntime({ inputBudget: { values } })`), as well as the [limits takumi's docs describe](../../isomer-image-takumi/docs/index.md#memory-on-a-small-server). Those costs hold for one chart or a grid alike up to 50,000 values; past that, one chart costs about twice what a grid of the same values does.

## Drawing text on a server

The renderer draws text as SVG `<text>` unless it is given a `font`, and with no `measureTextWidth` it lays that text out with Helvetica metrics. takumi then draws the `<text>` in the registered Inter, which is narrower, so a layout measured for Helvetica leaves gaps in it: a metric's unit sits apart from its value (`1.1   TB`). Measured across the 21 `metric` and `xyChart` examples at 2×:

|                                | `<text>`, Helvetica metrics (default) | Glyph outlines (`font`)                                | `<text>`, Inter advance widths (`measureTextWidth`) |
| ------------------------------ | ------------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| Layout matches what is drawn   | No                                    | Yes                                                    | Yes                                                 |
| Kerning                        | Yes, takumi's                         | No                                                     | Yes, takumi's                                       |
| `snapshot` markup, total       | 132 KB                                | 946 KB                                                 | 132 KB                                              |
| PNG, total                     | 292 KB                                | 301 KB                                                 | 301 KB                                              |
| takumi PNG per chart, median   | 4–6 ms                                | 5–7 ms                                                 | 5–7 ms                                              |
| PDF of 6 xy charts             | 164 KB                                | 137 KB                                                 | 164 KB                                              |
| Chart text selectable in a PDF | No                                    | No                                                     | No                                                  |
| Font data held                 | None                                  | Glyph table, about 3 MB of heap for four Latin weights | Advance widths                                      |

Glyph outlines lay text out correctly but drop kerning, grow the markup sevenfold, and cover only the glyphs extracted. Selection is no reason to choose either: in takumi's PDF, an inline SVG's `<text>` extracts as no text either. Keep `<text>`, and give the renderer a `measureTextWidth` from Inter's advance widths, the measure `createGlyphFont` builds from the same faces, so the layout is measured for the face takumi draws. The renderer's default is unchanged until that measure ships with this package.

## Known gaps

What the [browser engine's tolerance table](../../isomer-charts-elastic/docs/index.md#known-gaps-and-geometry-tolerance) lists holds here too, and the [look gate](#parity-gates) compares look within it. Drawn by Elastic Charts' headless renderer, these differ besides:

| Kind      | Gap                                                                                                                                                  | Effect                                                                 |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| metric    | Secondary text without a badge goes to Elastic Charts as props, since it draws no element; in a browser it is an element in the secondary's `color`  | Headless, that text draws in Elastic Charts' contrast color            |
| metric    | A title or subtitle too long for its tile is cut with an ellipsis                                                                                    | The drawn text is a prefix of the Scene's                              |
| metric    | Where a title wraps, the engines break it at different words and fit the value to what is left                                                       | A wrapped title's tile looks less alike: the look gate holds it to 0.5 |
| partition | Text is laid out with Helvetica metrics unless a `font` or `measureTextWidth` is given, so a name and its value can touch when drawn in another font | Spacing within slice labels differs                                    |

## Parity gates

Two gates hold this renderer to the Scene, and to the browser engine, over every example the charts pack has, nested in a `grid` or not, in both schemes. They record each Scene where the pack resolves and draws it, so a new example or chart primitive is covered without changing them; a Scene kind the engine supports without a check fails them.

- **Content** (`src/parity.test.ts`): each drawing passes the charts pack's [static renderer checks](../../isomer-primitives-charts/docs/rendering.md#testing-a-static-renderer), read from its SVG (its box, `<title>`, `<desc>`, background, `<text>` and paint), and the Elastic Charts engine's [`DebugState` checks](../../isomer-charts-elastic/docs/index.md#testing-a-static-drawing); every tick label Elastic Charts reports is drawn as SVG text. The browser engine's events are its own, [checked over every example](../../isomer-charts-elastic/docs/index.md#events).
- **Look** (`e2e/look.spec.ts`, run by `pnpm test:browser` after `pnpm build`), the Elastic Charts engine's `defineLookSuite`: in Chromium, the browser engine's drawing of each Scene is this renderer's drawing's size and scores a mean SSIM, on luminance at an eighth of their size with every pixel counted, of at least 0.75 against this renderer's drawing of the same Scene for xy and partition and 0.7 for metric; a metric whose title wraps is held to 0.5 (see the tolerance table). At that scale a tick label a few pixels off, or a metric value drawn a little smaller, reads as the same picture. Two Scenes with other data can still draw alike, a lone metric's number most of all, so the known-failing controls are pairs of examples established to differ in layout (tiles, slices, bars, marks, axes): each one's browser drawing scores below its tolerance against the other's drawing here. Tolerances and pairs were set from Chromium on Linux, as CI runs it, and macOS: the same Scene scored at least 0.82 for xy, 0.84 for partition, 0.76 for metric and 0.58 for a wrapped title, and the pairs at most 0.46. With #2939 rebased onto #2941, on macOS: at least 0.819 for xy, 0.840 for partition, 0.772 for metric and 0.734 for a wrapped title, and the pairs at most 0.422. `LOOK_SCORES=<file>` records every score.
