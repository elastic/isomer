---
navigation_title: Rendering
description: How the vega primitive draws on every surface, its theme and size, live views, images, and what it costs on a server.
---

# Rendering

## Why there is no Scene

Chart primitives resolve to a [Scene](../../isomer-primitives-charts/docs/scene.md), an engine-neutral chart that any `SceneRenderer` can draw. A Vega spec is a program whose only faithful engine is Vega: resolving one to a Scene would mean reimplementing Vega. So the pack's seam is the drawing itself:

```text
node → toVegaSpec (strip, bind data and results, compile Vega-Lite, theme, size)
     → renderVegaSvg (Vega's headless SVG, scrubbed, def ids scoped)
     → an SVG string every environment can draw
```

`renderVegaSvg` is synchronous: inline data evaluates without awaiting, and the loader gives the renderer nothing to wait for, so it draws what `view.toSVG()` draws without its promise. Its output is deterministic, and two charts on one page never share a def id.

## Surfaces

| Surface | What it draws |
| --- | --- |
| `react` | The inline SVG, in a `div` carrying the [node anchor](../../isomer-sdk/docs/rendering.md#node-anchors), with the link line and a basemap's attribution below it. In a browser, once mounted, a live Vega view of the same spec replaces the SVG: tooltips, signals, and the node's [chart events](index.md#interactions) through `onEvent`. Effects never run on a server, so server output is the SVG alone |
| `html` | The same SVG. With the `vegaInteractive` enhancement, each chart also embeds its compiled spec and its `id`, `data` and `interactions`, and `hydrateVega(root, { onEvent })` from `./client` makes it live |
| `snapshot` | The same SVG, for takumi to draw. `metrics.snapshotHeight` is the chart's height plus its link line |
| `text`, `markdown` | `title: description`; then `data` as a [`dataTable`](../../isomer-primitives-charts/docs/data-table.md) of it shows it, formatted, or else the first inline dataset's first 10 rows and 6 fields, as they are, with how many rows are left; then the link |
| `slack` | `vega` is the pack's `slackAssetTypes` entry: with `collectAssets`, a picture uploaded with the text as alt text; without, the Markdown |

A chart with `results` or a `basemap` draws statically everywhere: a live view would lose the basemap, and hover over results pruned to the drawing would show nothing.

A live view replaces the SVG only when it draws at the server's size, unscaled: Vega maps the pointer without CSS scaling, so a chart scaled into its box, such as a composite Vega-Lite view or one in a narrower container, keeps its SVG. A live view never draws past the 5,000-element cap: an update that would keeps the last drawing, and a first draw that would leaves the SVG. A view that cannot start leaves the SVG too, and a restart that fails puts it back.

`hydrateVega` returns the live views and `dispose()`. Call `dispose()` before removing or replacing hydrated charts: removing their markup leaves Vega's listeners and timers running. Hydrating a chart again replaces its live view.

A spec Vega cannot draw at render time draws a note in the chart's box instead: its title and description, with the reason in `data-isomer-vega-error`.

React Native has no Vega. A host draws a native node on its server with `drawVegaNode(node, { width, height }, VEGA_THEMES[scheme])`, the SVG the `react` surface draws, basemap included, and draws the string with `react-native-svg`. It validates on the device with the `./schema` entry.

## Theme

The theme is Kibana's Vega defaults (`VegaParser._setDefaultColors`), with EUI Borealis tokens for the scheme the render asks for: `context.scheme`, else the frame theme's `scheme`, as `chartsFrame` carries, else `light`. A spec's own `config` wins over each value.

| Value | Kibana's | Light | Dark |
| --- | --- | --- | --- |
| Categorical range | `euiColorVis0`–`9` | `#16C5C0`, … | the same |
| Mark color (`config.mark.color` for Vega-Lite; each mark type's fill or stroke for Vega, unless the spec colors it) | `euiColorVis0` | `#16C5C0` | `#16C5C0` |
| Text marks | `textParagraph` | `#384861` | `#B4C1D5` |
| Guide labels and titles, chart titles | `textSubdued` | `#516381` | `#98A8C3` |
| Axis ticks, domains and grid | `borderBaseSubdued` | `#E3E8F2` | `#2B394F` |

Kibana's other defaults come with it: axis titles at weight 500, no view stroke, a transparent background, area fill opacity 0.3 for Vega-Lite (with Kibana's 12-stop gradient and a 1.5 px line) and 0.5 for Vega. The pack also names EUI's font family, `Inter`, so text measures the same in an image as in a browser.

## Size

A chart draws in, first, the box its container gives it (`context.size`, as a charts `grid` panel passes), less the link and attribution lines; else its `width` and `height`; else 480 × 270. A single view fits the box with `autosize: fit`, unless the spec sets `autosize: none`, as Kibana allows; a composite Vega-Lite view (`concat`, `facet`, `repeat`) is scaled into it through the SVG's `viewBox`.

A chart with basemap tiles draws at its own `width` and `height`, the frame its tiles were stamped for, and scales into the box with them, so the overlay never shifts off the map.

In a browser the SVG is never wider than its container: in a narrower one, such as a `grid` panel laid out for the grid's nominal width, it scales down through its `viewBox`.

## Styling

The pack authors its chrome, the chart box, the link line and the fallback note, with [Distillate](https://elastic.github.io/distillate/), and declares its `distillery`, so a runtime styles it with every other pack's in one adapter and `html` and `snapshot` style its nodes with no host setup. Every class starts with `vega`. On the `react` surface the host ships `vegaStylesheet()`. A color only the scheme knows reaches its rule through a module-local var, so an element's `style` holds only custom properties its classes declare.

## Images and PDF

`snapshot` draws the inline SVG, which takumi lays out as it does the Elastic Charts engine's. Register `chartsFrame` and name it, so the page and the chart share a scheme:

```ts
const runtime = createIsomerRuntime({
  packs: [vegaPack],
  frames: { charts: chartsFrame },
});
const png = await takumi.png(
  await takumi.fit(
    runtime.surfaces.snapshot.render(composition, { frame: 'charts', theme: 'dark' })
  )
);
```

## Safety

Specs are author-written code, so every layer treats them as untrusted:

- **Validation and `sanitize`** remove every `url`, `href`, bound `element`, `usermeta` and non-keyword `cursor`.
- **The loader** refuses every load, fetch and file read.
- **The scene** loses every link and image source after the dataflow runs, and every style value a CSS parser could turn into a fetch, since a signal or a data row can set one. A fetching `background` becomes `transparent`, and the SVG is refused if any `url(` but a reference to its own defs survives.
- **Expressions** run through `vega-interpreter`, never `new Function`, so charts render under `--disallow-code-generation-from-strings`.
- **Events** cannot select elements outside the chart, and from the window a chart hears only the pointer events that carry on a drag, never keys or input. The cursor never styles the page. A live view sets only a keyword cursor, so a `cursor` signal cannot name an image, and a tooltip shows no `image` from the data.
- **A live view** scrubs its scene before every draw, as the server does once, since a signal or data can set a link or a fetching style, an array included.
- **A basemap** is only inline raster `data:` URIs, drawn beneath the chart, with its `attribution` on a line below.

## Loading Vega on Node

Vega is ESM only. A CommonJS host `require`s it, which Node allows for an ES module graph without a top-level `await`; `vega-canvas`'s Node build has one, `await import('canvas')`. The workspace patches it, as Kibana does, to resolve its browser build under `node` too (`patches/vega-canvas@2.0.0.patch`). A host that `require`s the pack applies the same patch; an ESM host needs none. Headless SVG needs no canvas: the canvas-only `label` and `wordcloud` transforms and the `heatmap` image fail, as they would without the `canvas` package.

`vega`, `vega-lite`, `vega-interpreter` and `vega-tooltip` are Kibana's versions, and the root `pnpm.overrides` pins every `vega-*` sub-package to what Kibana resolves, so one copy of each loads.

## Limits

What an image costs follows the SVG elements it draws, not the size of its data: takumi rasterizes each element, at about 0.4 ms per symbol at 2×. A line, area or trail is one path however many points it has: a line through 30,000 points rasterizes in under half a second, while 31,000 points as symbols took 22 s and 877 MB. A spec's size cannot bound this, since a few transforms can generate thousands of marks, so the pack counts what a chart draws and draws its fallback note past 5,000 elements: the worst image then takes about 2 s at 2× and stays under the memory the Elastic Charts engine's examples use.

The count bounds the drawing, not the work before it. Vega runs the dataflow synchronously, and a transform such as `sequence` can generate data far past what the spec's size suggests, so `renderVegaSvg` has no time or memory bound of its own. A server that draws specs for readers other than their authors runs it, and the `html` and `snapshot` surfaces, in a worker it can stop, with its own time and memory limits. The `react` surface draws inline, in the reader's own page, as Kibana draws a Vega panel.

The size limits bound the rest, parsing and memory: 250,000 characters of spec, about 12,000 rows of two numbers inline; 250,000 characters of results after pruning; 10,000 rows of `data`, within a 5,000-element drawing for any spec that aggregates or draws a line.

## Measuring it

`scripts/bench_render.cjs` draws Vega charts as a render service does: validation, which parses each spec, `snapshot` on `chartsFrame`, and takumi to PNG, in a fresh Node process under `--disallow-code-generation-from-strings`. On macOS arm64, Node 22, the median of three runs:

| Scenario | Peak RSS (MB) | Peak less loaded (MB) | Validate and draw (ms) | takumi PNG (ms) |
| --- | --- | --- | --- | --- |
| Every example, light and dark, 1× | 213 | 93 | 12 | 3.2 |
| One cold PNG, 2× | 135 | 17 | 40 | 5.3 |
| `budget-marks`: a scatter plot at the 5,000-element cap, 2× | 225 | 101 | 143 | 2,080 |
| `budget-spec`: a line through a spec at 250,000 characters, 2× | 188 | 67 | 280 | 310 |
| `budget-data`: a line through 10,000 rows of `data`, 2× | 183 | 63 | 226 | 16 |
| `budget-results`: a line through a search response stamped as 250,000 characters of results, 2× | 173 | 50 | 290 | 25 |
| `over-marks`: a 250,000-character scatter plot past the cap, drawn as a note | 176 | 56 | 255 | 3.7 |
| 16 PNGs at 2× through a limiter of 2 | 233 | 113 | 14 | 18 |

The script finds `budget-marks`'s point count in a process of its own, so no measured process draws the probes, and fails a run that drew anything but a chart with marks, or for `over-marks` the mark-cap note, so a chart Vega fails to draw never passes as a cheaper one.

Linux pays more for the same work, so read Linux for a server: on CI's Linux x64 runners, one cold PNG peaked at 135 MB and every other scenario at 294–364 MB, about 170 MB over loaded.

`pnpm --filter @elastic/isomer-primitives-vega bench:check`, part of `pnpm check:memory`, runs every scenario three times and fails when a median is over its bound in the script. A bound is about 1.5× the larger of the macOS and Linux x64 medians, with a floor for `one`'s small delta, so a runner's variance passes and a doubling fails.

## Developing

`pnpm --filter @elastic/isomer-primitives-vega studio` previews the pack in the Studio on every surface, with PNGs. The repository's Studio, `pnpm studio:dev`, shows it beside the other packs. `e2e/hydrate.spec.ts`, run by `pnpm test:browser`, hydrates charts in Chromium and checks a tooltip, a hover signal, a click's `chart.select`, a dragged `chart.brush`, a `cursor` signal naming an image, and that nothing is fetched.
