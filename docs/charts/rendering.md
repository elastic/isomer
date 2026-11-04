---
navigation_title: Rendering
description: How the charts pack draws a chart node through a SceneRenderer, and how a host chooses which one.
---

# Rendering

Every chart primitive's `react` renderer is a shim. It resolves the node to a [Scene](scene.md), picks a `SceneRenderer`, and hands it the Scene. The shim draws nothing itself, so replacing how a chart is drawn is configuration: primitives, compositions and materializers stay the same.

```ts
import { chartsPack, createChartsPack } from '@elastic/isomer-primitives-charts';

createIsomerRuntime({ packs: [chartsPack] });

const imagePack = createChartsPack({ sceneRenderers: [elasticChartsNode] });
```

`chartsPack` registers `metric`, `xyChart`, `grid` and `unsupported` with their defaults: charts resolve with [`resolveChart`](scene.md#resolvechart) and draw with `isomer-svg`. `createChartsPack` takes the pack's renderer preferences, and a `resolveScene` in place of `resolveChart`, with the same signature: `(node, { scheme, size?, locale?, timeZone? }) => Scene`.

The pack declares `CHARTS_INPUT_BUDGET` as its [input budget](../sdk/packs.md#inputbudget), 250,000 values and 10,000,000 characters, because chart nodes carry their data inline. A runtime that registers it validates compositions up to that size unless the host sets a budget of its own.

## Choosing a renderer

For each chart node, the shim tries renderers in this order and takes the first that runs in the render's environment and supports the Scene's kind:

1. `context.sceneRenderers`, the host's preference for this render;
2. the pack's `sceneRenderers`, given to `createChartsPack`;
3. `isomer-svg`, the pack's fallback, which supports every kind.

The `snapshot` surface takes no host context, so a host that wants a particular engine in images names it in the pack's `sceneRenderers`. A renderer is a plain value:

```ts
const metricTiles: SceneRenderer<ReactNode> = {
  id: 'metric-tiles',
  environments: ['browser'],
  supports: (kind) => kind === 'metric',
  render: (scene, env) => <MetricTiles scene={scene} nodeId={env.nodeId} />,
};

runtime.surfaces.react.render(composition, {
  context: { sceneRenderers: [metricTiles] },
});
```

Here metric nodes draw as `MetricTiles` in the browser, and every other kind, or any render outside a browser, keeps the pack's choice.

## The render context

`ChartsRenderContext` extends the SDK's render context. Every field is optional.

| Field | Effect |
| --- | --- |
| `sceneRenderers` | Renderers tried before the pack's own |
| `environment` | `browser`, `node` or `native`. Absent: detected from the global scope |
| `scheme` | `light` or `dark`. Absent: the frame theme's `scheme` field on `snapshot`, else `light` |
| `locale`, `timeZone` | Passed to the resolver. Absent: `resolveChart`'s defaults, `en` and `UTC`, for dates whose format names no time zone |
| `size` | The box the chart draws in. Absent: the renderer's default size |

A host that loads the charts pack without a style adapter names the runtime's type parameters to pass these fields, as [Runtime](../runtime/runtime.md#typing-the-render-context) shows.

Off native, the shim puts the renderer's output in one `div` that carries the [node anchor](../sdk/rendering.md#node-anchors). On native it returns the renderer's output unwrapped, since native has no `div`.

## `isomer-svg`

`isomerSvgRenderer` is the fallback: it draws every Scene kind as inline SVG, in the browser and on Node, and is what `snapshot` images use unless the pack names another engine. It reads only the Scene. Every color is a literal `fill` or `stroke` from the Scene, since a stylesheet does not reach inside an inline `svg`; every string is the Scene's own; ticks, legend order and draw order are the Scene's. Every length, ratio and glyph it adds comes from `SVG_THEME`.

The drawing is plain data before it is React, so it binds anywhere:

```ts
import { drawScene, toReactDom, toSvgMarkup } from '@elastic/isomer-primitives-charts';

const tree = drawScene(scene); // { tag, attrs, children }, SVG attribute names
toReactDom(tree);              // React DOM elements
toSvgMarkup(tree);             // an SVG string, for HTML or a native SvgXml
```

A native host maps the same tree onto its own SVG components.

The root `svg` is `role="img"`, labelled with the Scene's `summary`, and sized to the Scene's `size`, or `SVG_THEME.defaultSize` for its kind when the Scene has none. Groups carry `data-series`, `data-legend-key`, `data-tile`, `data-axis` and `data-row` attributes, and every selectable part a `data-hit`, so tests and enhancements can find marks without class names. A series whose legend item is hidden is not drawn. Rows the node's `emphasis` names are outlined in the Scene's text color: bars and tiles with a stroke, line marks with a larger point.

What it draws differs from Elastic Charts in layout, not content:

| Scene field | `isomer-svg` |
| --- | --- |
| `areaFill: 'gradient'` | A solid fill at `areaOpacity` |
| `layout.icon` on a metric | Not drawn |
| `fitting` | Fills a gap from its neighbors by the fitting kind; with `emphasize`, the fitted segments are dashed |
| `interpolation: 'smooth'` | A Catmull–Rom curve through the marks |
| Text width | Estimated from `SVG_THEME.font.widthRatio`, so long labels may overlap where Elastic Charts would measure and truncate |

`metrics.snapshotHeight` is the default height for an `xyChart`, and the default tile height times the rows of tiles for a `metric`: one row without a breakdown, otherwise the rows at `breakdown.maxColumns` per row, or Kibana's default of 3.

### Interactions

With the host's `onEvent` and the node's `id`, `isomer-svg` draws `InteractiveSceneSvg`; without either, it draws static SVG and nothing answers a gesture. The shim passes each event to the host's `context.onEvent` as a `chart.select` or `chart.brush` action event (`toActionEvent`), which `readChartEvent` reads back.

| Gesture | Effect |
| --- | --- |
| Pointer over a mark or tile | The Scene's tooltip for it; other series dim |
| Click a mark or tile | `chart.select` with its `datum` or `tile` selection |
| Click a line | `chart.select` with its `series` selection |
| Click an x tick | `chart.select` with that `category` |
| Click a legend label | `chart.select` with its `legend` selection, or a visibility toggle when the node offers none |
| Click a legend swatch | Hides or shows the series; no event |
| Drag across the plot | `chart.brush`, when the node offers a brush; each end snaps to the nearest x position |
| Tab, then arrow keys, Home and End | Moves focus over the marks in draw order, with a focus ring, the tooltip and the selection's description in the chart's label |
| Enter or Space | `chart.select` for the focused mark |
| Alt with a click, Enter or Space | The same event with `negate`, a "filter out" |

Every event comes from the Scene's `selectEvent` and `brushEvent`, so it is the event any other renderer raises for the same gesture. A selection appears only where the node offers its target. A node's `interactions.link` is drawn as a link under the chart by the shim, for every renderer, and written on text and Markdown.

## Images and PDF

`chartsFrame` is a content-sized page for the `snapshot` surface: the body in a column on the scheme's background, `CHARTS_THEME.frame.width` (960 px) wide. Its theme carries `scheme`, so every chart, nested in a grid or not, resolves for the scheme the render asks for.

```ts
const runtime = createIsomerRuntime({ packs: [chartsPack], frames: { charts: chartsFrame } });
const png = await takumi.png(await takumi.fit(runtime.surfaces.snapshot.render(composition, { theme: 'dark' })));
```

`remote_render.test.ts` draws every example through takumi with no browser, to PNG in both schemes and to one PDF with its fonts embedded, in CI.

## Text, Markdown and Slack

The `text` and `markdown` renderers take no render context. They resolve the Scene for the light scheme and write its `summary`, then its `table`, then its link when the node has one: a header row of column labels and one row per data row, in `data` order. Columns the Scene flags as empty are left out, and an empty cell carries the Scene's empty-value text. Markdown writes the table as a GFM table. `sceneToText` and `sceneToMarkdown` do this for any Scene.

```text
Requests over time: Count of records by @timestamp per hour, from 98 to 210.

@timestamp per hour | Count of records
00:00 | 120
01:00 | 98
```

On Slack, `metric` and `xyChart` are the pack's `slackAssetTypes`. With `collectAssets`, each chart becomes an `image` block and an upload request for a `snapshot` render of the node, with its text as the alt text, cut to Slack's limit. Without it, a chart is its Markdown converted to Block Kit. A `grid` keeps its nested charts' pictures: its title is a header, each section a container, and each panel title a header above its node.

## `grid`

A `grid` draws its panels on 48 columns with CSS grid, one row unit `CHARTS_THEME.grid.rowHeight` pixels tall. A panel's title is its header and its description is the header's tooltip; the node draws below. Panels are in [reading order](grid.md) in the markup, so a screen reader and the one-column layout read them alike.

When the context carries a `size` narrower than 768 px, the grid draws one column in reading order instead. Each panel's node gets a context with the `size` its panel leaves it, so a chart resolves its ticks for that box and fits the panel's height. Without a `size` from the host, the grid lays out for `CHARTS_THEME.grid.nominalWidth` (1,200 px); a chart drawn by `isomer-svg` then scales down to its panel's real width.

On `snapshot`, each nested node receives the frame theme, so charts inside a grid draw the frame's scheme. `metrics.snapshotHeight` sums the rows, section headers and gaps at full width. Text, Markdown and Slack list the panels in reading order under their section titles; a collapsed section is its title alone.

## `unsupported`

An `unsupported` node draws a note with its title, reason and link, in the page's text color. Text and Markdown write the same three.
