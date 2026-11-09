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
| `react` | The inline SVG, in a `div` carrying the [node anchor](../../isomer-sdk/docs/rendering.md#node-anchors), with the link line below it. In a browser, once mounted, a live Vega view of the same spec replaces the SVG: tooltips, signals, and the node's [chart events](index.md#interactions) through `onEvent`. Effects never run on a server, so server output is the SVG alone |
| `html` | The same SVG. With the `vegaInteractive` enhancement, each chart also embeds its compiled spec and its `id`, `data` and `interactions`, and `hydrateVega(root, { onEvent })` from `./client` makes it live |
| `snapshot` | The same SVG, for takumi to draw. `metrics.snapshotHeight` is the chart's height plus its link line |
| `text`, `markdown` | `title: description`; then `data` as a [`dataTable`](../../isomer-primitives-charts/docs/data-table.md) of it shows it, formatted, or else the first inline dataset's first 10 rows and 6 fields, as they are, with how many rows are left; then the link |
| `slack` | `vega` is the pack's `slackAssetTypes` entry: with `collectAssets`, a picture uploaded with the text as alt text; without, the Markdown |

A chart with `results` or a `basemap` draws statically everywhere: a live view would lose the basemap, and hover over results pruned to the drawing would show nothing.

A spec Vega cannot draw at render time draws a note in the chart's box instead: its title and description, with the reason in `data-isomer-vega-error`.

React Native has no Vega. A host draws a native node by rendering `renderVegaSvg(toVegaSpec(…))` on its server and drawing the string with `react-native-svg`, and validates on the device with the `./schema` entry.

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

A chart draws in, first, the box its container gives it (`context.size`, as a charts `grid` panel passes), less its link line; else its `width` and `height`; else 480 × 270. A single view fits the box with `autosize: fit`, unless the spec sets `autosize: none`, as Kibana allows; a composite Vega-Lite view (`concat`, `facet`, `repeat`) is scaled into it through the SVG's `viewBox`.

## Styling

The pack authors its chrome, the chart box, the link line and the fallback note, with [Distillate](https://elastic.github.io/distillate/), and ships its own style adapter, so `html` and `snapshot` style its nodes with no host setup. Every class starts with `vega`. On the `react` surface the host ships `vegaStylesheet()`. A color only the scheme knows reaches its rule through a module-local var, so an element's `style` holds only custom properties its classes declare.

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
- **Events** cannot select elements outside the chart, and the cursor never styles the page.
- **A basemap** is only inline raster `data:` URIs, drawn beneath the chart.

## Loading Vega on Node

Vega is ESM only. A CommonJS host `require`s it, which Node allows for an ES module graph without a top-level `await`; `vega-canvas`'s Node build has one, `await import('canvas')`. The workspace patches it, as Kibana does, to resolve its browser build under `node` too (`patches/vega-canvas@2.0.0.patch`). A host that `require`s the pack applies the same patch; an ESM host needs none. Headless SVG needs no canvas: the canvas-only `label` and `wordcloud` transforms and the `heatmap` image fail, as they would without the `canvas` package.

`vega`, `vega-lite`, `vega-interpreter` and `vega-tooltip` are Kibana's versions, and the root `pnpm.overrides` pins every `vega-*` sub-package to what Kibana resolves, so one copy of each loads.

## Measuring it

`scripts/bench_render.cjs` draws Vega charts as a render service does: validation, which parses each spec, `snapshot` on `chartsFrame`, and takumi to PNG, in a fresh Node process under `--disallow-code-generation-from-strings`. On macOS arm64, Node 22, two runs each:

| Measure | every example, light and dark, 1× | one cold PNG at 2× | a spec at the 1,000,000-character limit (about 31,000 points), 2× | 16 PNGs at 2× through a limiter of 2 |
| --- | --- | --- | --- | --- |
| Peak RSS (MB) | 212 | 137 | 884 | 231 |
| Peak RSS less loaded (MB) | 93 | 18 | 764 | 113 |
| Validate and draw per chart, median (ms) | 14 | 45 | 1,996 | 15 |
| takumi PNG per chart, median (ms) | 3.5 | 5.6 | 23,668 | 18 |

Vega itself is cheap; a spec at the size limit is not, because takumi rasterizes one SVG element per mark. A render service runs each render under its own time limit.

`pnpm --filter @elastic/isomer-primitives-vega bench:check`, part of `pnpm check:memory`, runs every scenario three times and fails when a median is over its bound in the script.

## Developing

`pnpm --filter @elastic/isomer-primitives-vega studio` previews the pack in the Studio on every surface, with PNGs. The repository's Studio, `pnpm studio:dev`, shows it beside the other packs. `e2e/hydrate.spec.ts`, run by `pnpm test:browser`, hydrates a chart in Chromium and checks its tooltip, a hover signal, a click's `chart.select`, and that nothing is fetched.
