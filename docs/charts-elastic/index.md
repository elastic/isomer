---
navigation_title: Elastic Charts engine
description: A SceneRenderer that draws chart Scenes with Elastic Charts in the browser, as Kibana draws its panels.
---

# Elastic Charts engine

`@elastic/isomer-charts-elastic` draws [chart Scenes](../charts/scene.md) with [Elastic Charts](https://github.com/elastic/elastic-charts), the library Kibana draws its panels with, so a chart in a browser host looks like the Kibana panel it came from. It is a `SceneRenderer` for the browser and supports the `metric` and `xy` kinds.

```sh
npm install @elastic/isomer-charts-elastic @elastic/charts moment moment-timezone react react-dom zod
```

```ts
import { createElasticChartsRenderer } from '@elastic/isomer-charts-elastic';
import '@elastic/charts/dist/theme_light.css';

const renderer = createElasticChartsRenderer();
renderer.render(scene, { environment: 'browser', nodeId: node.id, onEvent });
```

The page needs Elastic Charts' stylesheet for the Scene's scheme, `theme_light.css` or `theme_dark.css`; without it a chart measures zero and draws nothing. Kibana always loads it. A chart drawn in a shadow root needs the stylesheet inside that root, and on the document too: Elastic Charts portals its own xy tooltip to `document.body`, while this engine's secondary-metric tooltip stays in the chart's root.

`@elastic/charts`, React and React DOM are peer dependencies, so a host shares its own copy: Kibana's pin is the version this engine is tested against (`ELASTIC_CHARTS_VERSION`).

## One spec builder

`sceneSpecs(scene, env, options?)` turns a `metric` or `xy` Scene into Elastic Charts spec elements: `Settings`, axes, series, reference lines and annotations in the Scene's layer order, or the metric grid. The renderer wraps them in `<Chart>`; headless drawing hands the same elements to Elastic Charts' `collectSpecs`, so a chart drawn in a browser and one drawn on a server come from one place.

## Headless, on Node

`@elastic/isomer-charts-elastic/headless` draws the same specs with Elastic Charts' headless renderer, with no DOM, worker or native canvas. It needs a release of Elastic Charts with headless SVG output ([elastic/elastic-charts#2939](https://github.com/elastic/elastic-charts/pull/2939)). Until one ships, this repository's `feature/charts-rendering` branch installs a build of that pull request from `vendor/elastic-charts`.

```ts
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { createElasticChartsHeadlessRenderer } from '@elastic/isomer-charts-elastic/headless';

const imagePack = createChartsPack({
  sceneRenderers: [createElasticChartsHeadlessRenderer({ font })],
});
```

`createElasticChartsHeadlessRenderer` is a `sized` `SceneRenderer` for `metric` and `xy`. It runs on `node`; pass `environments` to add `browser` where markup is static, such as a preview of the `html` or `snapshot` surface. It puts the chart's SVG inline in a `div`, so `snapshot` markup carries it to an image backend such as takumi. Register it in the pack's `sceneRenderers`, since `snapshot` takes no host context. It draws at the Scene's `size`. Being `sized`, it gets a Scene with one wherever it draws: a grid panel's box, the host's `size`, or the chart's [size spec](../charts/rendering.md#chart-size).

`renderSceneSvg(scene, options?)` returns `{ svg, width, height, debugState? }`. Options choose how text is drawn:

| Option | Text |
| --- | --- |
| `font` | Glyph outlines of this font, the same wherever the chart is drawn |
| `measureTextWidth` | SVG `<text>`, laid out with this measure |
| neither | SVG `<text>`, laid out with Elastic Charts' Helvetica metrics |

The SVG is a `role="img"` named by the Scene's `title` as its `<title>` and described by its `summary`, then its `description` when the node states one, as its `<desc>`, as `Settings` takes them in a browser. `debugState` is what `<Chart debugState>` reports; the vendored build returns it from a headless render through a patch offered on #2939. Metric has no DebugState in Elastic Charts, so a metric is checked by the text in its SVG.

Headless metrics differ from the browser's: values draw smaller and words can break mid-word. Those gaps are Elastic Charts', reported on #2939.

### In the Studio

The repository Studio (`pnpm studio:dev`) draws charts with the headless renderer in the browser and on its server alike. Its previews are static markup, which a live `<Chart>` can't draw into.

`pnpm --filter @elastic/isomer-charts-elastic studio` opens the charts as a render service would draw them. The Studio's Node server draws each chart with headless Elastic Charts and rasterizes it with takumi to PNG and PDF, with Inter as the image font. `studio:check` renders every example on every surface, PNG included.

In a browser, the renderer scales its SVG to the container at the drawing's aspect ratio, never past the size it was drawn at, so a grid laid out fluidly still fits. Each SVG's ids are prefixed by a hash of the drawing, so several charts inline in one page keep their own clip paths. A host drawing in a browser passes `measureTextWidth`, backed by a canvas, so text is laid out as the browser will draw it.

### Measuring it

`pnpm --filter @elastic/isomer-charts-elastic bench` measures what a render service pays to draw charts: validation, the `snapshot` surface, headless Elastic Charts and takumi to PNG, on one shared backend with Inter Latin registered once. Each run is a fresh Node process loading the CommonJS build, so run `pnpm build` first. Scenarios:

| Scenario | What it draws |
| --- | --- |
| `baseline` | Every `metric` and `xyChart` example, light and dark, at 1×, with no chart engine (the pack's summary fallback) |
| `headless` | The same, with headless Elastic Charts; the difference from `baseline` is the engine's |
| `one` | One xy chart at 2×: the one-off PNG |
| `budget-xy` | One xy line at the charts pack's whole input budget (250,000 values, about 83,000 points), at 2× |
| `budget-grid` | 40 xy panels in a `grid` sharing that budget, the dashboard the budget was sized for, at 2× |
| `burst-limited` | 16 xy charts at 2× requested at once, through the [limiter in takumi's docs](../image-takumi/index.md#memory-on-a-small-server), of 2 |
| `burst-unlimited` | The same 16 with no limiter |

Each reports peak RSS; RSS once everything is loaded and the fonts registered; peak less loaded, which is what rendering adds; heap held after the run and a forced GC; cold start to the first PNG; the median validate-and-draw and rasterization time per chart; and the largest PNG. `--scenarios a,b` picks scenarios, `--runs n` sets runs per scenario, `--repeat <n>` draws a scenario's charts n times in one process, `--values <n>` replaces the input budget the `budget-*` scenarios fill, `--cache-max-bytes <n>` sets takumi's resource cache, and `--json` prints every run, as one JSON document even with `--check`, which then reports its bounds on stderr. A held heap that stays flat as `--repeat` grows rules out a JavaScript leak, but not native growth: takumi and its buffers allocate outside the heap, and peak RSS is only a high-water mark.

`pnpm --filter @elastic/isomer-charts-elastic bench:check` (`pnpm check:memory` from the root, part of `pnpm verify` and CI) runs `headless`, `one`, both `budget-*` scenarios and `burst-limited` three times each, and fails when a scenario's median peak RSS or peak less loaded is over its bound in `scripts/bench_render.cjs`. A bound is about 1.5× the largest of what macOS arm64, Linux arm64 and Linux x64 (emulated on arm64) measured on Node 24, so a runner's variance passes and a doubling fails. The median of three runs, rather than the largest, keeps one slow garbage collection from failing a build. Lower a bound when a change makes rendering cheaper, so the gain is kept.

Measured on Node 24, MB:

| Scenario | Peak RSS, macOS arm64 | Peak RSS, Linux arm64 | Peak RSS, Linux x64 (emulated) | Peak less loaded, Linux arm64 | Validate and draw, Linux arm64 |
| --- | --- | --- | --- | --- | --- |
| `one` | 148–150 | 149 | 196–197 | 16 | 35–43 ms |
| `headless` (42 charts) | 177–182 | 238–240 | 298 | 105–107 | 5 ms each |
| `burst-limited` (16 at 2×) | 198–201 | 257–270 | 308–329 | 124–137 | 9–18 ms each |
| `budget-grid` | 492–505 | 567–577 | 630–635 | 428–437 | 1.9–2.3 s |
| `budget-xy` | 836–988 | 991–1065 | 1052–1092 | 852–926 | 3.3–3.8 s |

Loaded RSS is about 130 MB on arm64, of which headless Elastic Charts is about 48 MB, and about 170 MB under x64 emulation, which adds its own overhead; the emulated column bounds what CI's x64 runners may see rather than measuring them. Inter Latin at four weights is about 1 MB. Linux pays more than macOS for the same work, so read the Linux column for a server.

What a one-off chart PNG costs is small: about 16 MB over loaded for a typical xy chart, and 15 to 40 ms. What it costs grows with the data drawn: on Linux, about 185 MB over loaded at 25,000 input values, 250 MB at 50,000 and 900 MB at 250,000. The charts pack's input budget, sized for a 40-panel dashboard, admits a single chart whose render needs around 900 MB on Linux, which does not fit beside Kibana on a 1 GB instance. Two things make the large case expensive:

- Through the `snapshot` surface, the charts pack resolves each chart's Scene five times: once for the frame's height estimate, then twice in each of its two React passes (styles, then markup), unsized and then at the chart's box. The engine draws the SVG twice. At 83,000 points, a resolve takes about 550 ms and builds a Scene of about 22 MB as JSON: 13 MB of layers, 5 MB of formatted `table` and 3 MB of categories. A host can pass `createChartsPack` a `resolveScene` memoized on the node and its options, and a renderer memoized on the Scene; measured on macOS, that took `budget-xy` from 836–988 MB to 665 MB and its draw from 3.2–4.1 s to 1.9 s.
- Headless Elastic Charts keeps the selector state of its last two charts after drawing: about 130 MB of heap after a 40,000-point chart, released as later charts replace it. It is bounded, not a leak.

So a PNG host on a small instance sets a lower input budget of its own (`createIsomerRuntime({ inputBudget: { values } })`), as well as the [limits takumi's docs describe](../image-takumi/index.md#memory-on-a-small-server). Those costs hold for one chart or a grid alike up to 50,000 values; past that, one chart costs about twice what a grid of the same values does.

### Drawing text on a server

The headless renderer draws text as SVG `<text>` unless it is given a `font`, and with no `measureTextWidth` it lays that text out with Helvetica metrics. takumi then draws the `<text>` in the registered Inter, which is narrower, so a layout measured for Helvetica leaves gaps in it: a metric's unit sits apart from its value (`1.1   TB`). Measured across the 21 `metric` and `xyChart` examples at 2×:

| | `<text>`, Helvetica metrics (default) | Glyph outlines (`font`) | `<text>`, Inter advance widths (`measureTextWidth`) |
| --- | --- | --- | --- |
| Layout matches what is drawn | No | Yes | Yes |
| Kerning | Yes, takumi's | No | Yes, takumi's |
| `snapshot` markup, total | 132 KB | 946 KB | 132 KB |
| PNG, total | 292 KB | 301 KB | 301 KB |
| takumi PNG per chart, median | 4–6 ms | 5–7 ms | 5–7 ms |
| PDF of 6 xy charts | 164 KB | 137 KB | 164 KB |
| Chart text selectable in a PDF | No | No | No |
| Font data held | None | Glyph table, about 3 MB of heap for four Latin weights | Advance widths |

Glyph outlines lay text out correctly but drop kerning, grow the markup sevenfold, and cover only the glyphs extracted. Selection is no reason to choose either: in takumi's PDF, an inline SVG's `<text>` extracts as no text either. Keep `<text>`, and give the renderer a `measureTextWidth` from Inter's advance widths, the measure `createGlyphFont` builds from the same faces, so the layout is measured for the face takumi draws. The renderer's default is unchanged until that measure ships with this package.

## What it takes from the Scene

Colors, text and series are the Scene's, and draw order is as far as Elastic Charts' paint bands allow (see the tolerance table). Ticks, domains, stacks and point density are Elastic Charts', computed from the intent each Scene axis and series states, the way Kibana's xy expression hands them over. A tick label prints through `formatAxisValue`, so it reads the same in every engine.

| Elastic Charts input | From the Scene |
| --- | --- |
| Base theme | Kibana's charts base theme for the Scene's `scheme`: Elastic Charts' Borealis theme with the `Elastic UI Numeric` font first and axis titles in the tick-label color at weight 500, as Kibana's charts plugin builds it |
| Background, axis, tick, grid-line and title colors | `chrome` |
| Series colors and names | The `series` layers |
| Stacking | Unstacked `y` with `stackAccessors`; a `percentage` stack sets `stackMode: 'percentage'` |
| y domain | `custom` is `{ min, max }`; `data` is `fit: !includeZero` with the axis's reference lines in `includeDataFromIds`, as Kibana's `getAxisDomain` builds it |
| x domain | The `categories` in order on an ordinal axis; `custom` is `{ min, max }`; otherwise Elastic Charts' own. A stated `interval` is `minInterval`, which sizes the bars |
| Rounding | `xNice` and `yNice` from each axis's `domain.rounding` |
| Points | `points`: `auto`, `visible` and `hidden` are `'auto'`, `'always'` and `'never'` |
| Time zone | The x axis's `timeZone`, else the Scene's |
| Tick labels | A category's `label` on an ordinal axis; any other value through `formatAxisValue` |
| Value labels | The mark's `label`; on a percentage stack, the mark's share through the y axis, as Lens prints it |
| Tooltip | The hovered position's category `label` (else as its axis labels it), then each hovered series' name, color and mark `label` |
| Legend position, layout, size, title and truncation | `legend` |
| Reference lines and annotations | The `referenceLine` and `annotation` layers, styled as Kibana's xy chart styles them; a range with `fill: 'outside'` draws beside the axis. A layer before the first series gets a `zIndex` that paints it beneath every series; any later one paints above them, except a range, which paints beneath the data wherever it sits, as Kibana's xy chart draws it |
| Metric tiles, layout and alignment | `tiles` and `layout`, as Kibana's metric visualization sets them; the value prints the tile's `value.text`, a comparison badge's glyph is its `icon`, and secondary text without a badge draws in its `color` |
| Accessible label and description | `title`; `summary`, then `description` when the node states one |

With `debugState: true`, or when the page sets `window._echDebugStateFlag` as Kibana's functional tests do, Elastic Charts writes its `DebugState` to the chart.

## Events

With `onEvent` and a node id, a gesture raises the event of the Scene part it lands on, through the Scene's [selections](../charts/scene.md#selections-and-events). Elastic Charts' own indexes and values are never used.

| Gesture | Elastic Charts callback | Event |
| --- | --- | --- |
| Click a bar, point or area vertex | `onElementClick` (the first element, as Kibana takes it) | `datum`; `category` when the node offers no `datum` |
| Click the plot away from a mark | `onProjectionClick` | `category`: the x position the click falls in |
| Drag along a continuous x axis | `onBrushEnd` | `brush` |
| "Filter for" or "Filter out" beside a legend item | Legend action | `legend`, with `negate` for "Filter out" |
| Click a metric tile | `onElementClick` | `tile` |

Clicking a legend item's label toggles its series, which raises nothing.

## Known gaps and geometry tolerance

Content (strings, colors, order) is the Scene's. Where Elastic Charts cannot take a value from the Scene, its layout or a feature differs from the Scene, and Gate B compares look within these tolerances:

| Kind | Gap | Effect |
| --- | --- | --- |
| xy | Time axes draw on one row (`timeAxisLayerCount: 0`), so every label prints through `formatAxisValue` | Kibana draws a two-row time axis; tick label layout differs |
| xy | Series stack by axis: Elastic Charts has no stack group, so two stacked layers on one axis stack together | Matches Kibana; differs from the Scene's `stack.group` |
| xy | Bars on a continuous x axis use histogram mode when stacked or alone, as Kibana's rule is; the Scene does not state it | Bar placement follows Kibana's rule, not the Scene |
| xy | `legend.items[].statistics` are not drawn | Legend statistics missing |
| xy | `legend.items[].hidden` is not applied: Elastic Charts has no public initial deselection | Hidden series draw until a reader toggles them |
| xy | Annotation and reference-line icons and text markers are not drawn | Lines and fills only |
| xy | `currentTime` is not drawn: the Scene gives it no color | No current-time marker |
| xy | `interactions.emphasis` and `sync` are not drawn | No static highlight or synced cursor |
| xy | No gesture raises the `series` select target; legend actions raise `legend` | A node offering `series` raises nothing for it |
| xy | `partial` marks are not shaded | No end-zone shading |
| xy | Elastic Charts paints in fixed bands: annotations beneath the series, then bars, areas and lines, then annotations above. A reference line or point annotation between two series paints above both, a range after a series paints beneath it, and series of different marks paint bars first, then areas, then lines, whatever their order in `layers` | Overlap between layers can differ from the Scene's order |
| xy | A value label's formatter sees only the value, so where marks in one series share a value but carry different `label`s, none of them is labelled | Those value labels are missing rather than another mark's |
| metric | `layout.icon` is not drawn: Elastic Charts takes an icon component, and this engine maps no `ChartGlyph` to one | No tile icon |
| metric | `trend.xDomain` and `trend.yDomain` are not applied: Elastic Charts fits the trend to its points | Trend line scale may differ |
| metric | Title and subtitle colors are Elastic Charts' contrast choice against the tile background | Title color may differ from the Scene's `chrome.text` |
| metric | A progress bar draws `progress.fraction` against a domain of 1 | Bar length matches; Elastic Charts' accessible progress text reads the fraction |
| both | Pixel layout (margins, label placement, legend width) | Geometry compared within tolerance, not exactly |

`link` is drawn by the primitive around the renderer, not inside the chart.
