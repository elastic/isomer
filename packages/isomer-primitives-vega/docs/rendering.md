---
navigation_title: Rendering
description: How the vega primitive draws on every surface, its theme and size, images, and what it costs on a server.
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
| `react` | The inline SVG, in a `div` carrying the [node anchor](../../isomer-sdk/docs/rendering.md#node-anchors), with the link line and a basemap's attribution below it. |
| `html` | The same SVG |
| `snapshot` | The same SVG, for takumi to draw. `metrics.snapshotHeight` is the chart's height plus its link line |
| `text`, `markdown` | `title: description`; then `data` as a [`dataTable`](../../isomer-primitives-charts/docs/data-table.md) of it shows it, formatted, or else the first inline dataset's first 10 rows and 6 fields, as they are, with how many rows are left; then the link |
| `slack` | `vega` is the pack's `slackAssetTypes` entry: with `collectAssets`, a picture uploaded with the text as alt text; without, the Markdown |

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
- **Events** cannot select elements outside the chart, and the cursor never styles the page.
- **A basemap** is only inline raster `data:` URIs, drawn beneath the chart, with its `attribution` on a line below.

## Loading Vega on Node

Vega is ESM only. A CommonJS host `require`s it, which Node allows for an ES module graph without a top-level `await`; `vega-canvas`'s Node build has one, `await import('canvas')`. The workspace patches it, as Kibana does, to resolve its browser build under `node` too (`patches/vega-canvas@2.0.0.patch`). A host that `require`s the pack applies the same patch; an ESM host needs none. Headless SVG needs no canvas: the canvas-only `label` and `wordcloud` transforms and the `heatmap` image fail, as they would without the `canvas` package.

`vega`, `vega-lite` and `vega-interpreter` are Kibana's versions, and the root `pnpm.overrides` pins every `vega-*` sub-package to what Kibana resolves, so one copy of each loads.

## Limits

What an image costs follows the SVG elements it draws, not the size of its data: takumi rasterizes each element, at about 0.4 ms per symbol at 2×. A line, area or trail is one path however many points it has: a line through 30,000 points rasterizes in under half a second, while 31,000 points as symbols took 22 s and 877 MB. A spec's size cannot bound this, since a few transforms can generate thousands of marks, so the pack counts what a chart draws and draws its fallback note past 5,000 elements: the worst image then takes about 2 s at 2× and stays under the memory the Elastic Charts engine's examples use.

The count bounds the drawing, not the work before it. Vega runs the dataflow synchronously, and a transform such as `sequence` can generate data far past what the spec's size suggests, so `renderVegaSvg` has no time or memory bound of its own. A server that draws specs for readers other than their authors runs it, and the `html` and `snapshot` surfaces, in a worker it can stop, with its own time and memory limits. The `react` surface draws inline, in the reader's own page, as Kibana draws a Vega panel.

The size limits bound the rest, parsing and memory: 250,000 characters of spec, about 12,000 rows of two numbers inline; 250,000 characters of results after pruning; 10,000 rows of `data`, within a 5,000-element drawing for any spec that aggregates or draws a line.

## Developing

`pnpm --filter @elastic/isomer-primitives-vega studio` previews the pack in the Studio on every surface, with PNGs. The repository's Studio, `pnpm studio:dev`, shows it beside the other packs.
