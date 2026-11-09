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

`chartsPack` registers `metric`, `xyChart`, `dataTable`, `grid` and `unsupported` with their defaults: charts resolve with [`resolveChart`](scene.md#resolvechart) and draw with the pack's fallback, the Scene's summary sentence, until a host registers an engine. `createChartsPack` takes the pack's renderer preferences, and a `resolveScene` in place of `resolveChart`, with the same signature: `(node, { scheme, size?, locale?, timeZone? }) => Scene`.

The pack declares an [input budget](../sdk/packs.md#inputbudget), 250,000 values and 10,000,000 characters, because chart nodes carry their data inline. A runtime that registers it validates compositions up to that size unless the host sets a budget of its own.

## Choosing a renderer

For each chart node, the shim tries renderers in this order and takes the first that runs in the render's environment and supports the Scene's kind:

1. `context.sceneRenderers`, the host's preference for this render;
2. the pack's `sceneRenderers`, given to `createChartsPack`;
3. the pack's own renderers: its table renderer for `table` Scenes (see [`dataTable`](data-table.md#surfaces)), then the fallback, which draws the Scene's summary sentence for every kind in a browser and on Node.

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
| `environment` | `browser` or `node`. Absent: detected from the global scope |
| `scheme` | `light` or `dark`. Absent: the frame theme's `scheme` field on `snapshot`, else `light` |
| `locale`, `timeZone` | Passed to the resolver. Absent: `resolveChart`'s defaults, `en` and `UTC`, for dates whose format names no time zone |
| `size` | The box the chart draws in. Absent: the chart's [size spec](#chart-size) |

A host that loads the charts pack without a style adapter names the runtime's type parameters to pass these fields, as [Runtime](../runtime/runtime.md#typing-the-render-context) shows.

When the context carries `onEvent`, the shim passes the renderer an `onEvent` that wraps each `ChartEvent` with `toActionEvent`. Without it the renderer gets none and the chart is not interactive.

The shim puts the renderer's output in one `div` that carries the [node anchor](../sdk/rendering.md#node-anchors).

## Chart size

A chart in a grid panel draws in the box the panel leaves it, and a host can pass any chart a `size`. Without either, a chart takes its kind's size spec, as Lens's chart size specs do. Every length comes from `CHARTS_THEME.chart`:

| Kind | Spec |
| --- | --- |
| `xyChart` over time, drawn vertically | 16:9, at least 300 px tall |
| Any other `xyChart` | 16:9. Lens fills its container instead; outside a sized container there is nothing to fill |
| `metric` with one tile | 300:160, at most 300 px wide |
| `metric` with several tiles | One square tile side per tile, in the tile grid's columns and rows, at most 200 px per column |
| `dataTable` | None: the table is its rows tall |

In a browser, a `fluid` renderer's `div` takes the spec as CSS (`width: 100%`, `aspect-ratio`, `min-height`, `max-width`), and the renderer fills it; any other renderer, such as the summary fallback, sizes itself. On Node there is no container to fill, and a `sized` renderer draws a fixed-size picture wherever it runs, so in either case the chart resolves for the spec's box at `CHARTS_THEME.chart.width` (480 px), and `metric` and `xyChart` report that box's height to `snapshot` frames as `metrics.snapshotHeight`. A `sized` renderer gets a `dataTable` at that width and its rows' height.

## Styling

The pack authors its CSS with [Distillate](https://elastic.github.io/distillate/) and ships its own style adapter, so the `html` and `snapshot` surfaces style its nodes with no host setup, beside another pack's adapter too. Its renderers resolve class names through the render context's `resolveClassName`. Without one, as on the `react` surface, they write Distillate's readable names, and the host ships `chartsStylesheet()`, every rule the pack draws with. Every class name starts with `charts`, so none collides with another library's. What a node or a Scene carries, such as a panel's place on the grid, stays an inline style.

## Text, Markdown and Slack

The `text` and `markdown` renderers take no render context. They resolve the Scene for the light scheme and write its `summary`, its `description` and each emphasis `note`, then its `table`: a header row of column labels, one row per data row, in `data` order, and a `dataTable`'s footer row. Columns the Scene flags as empty are left out, and an empty cell carries the Scene's empty-value text. Markdown writes the table as a GFM table. Last comes the Scene's `link`, as `label: href` (a Markdown link). The fallback renderer draws the summary, description, notes and link. A `link` whose `href` fails the SDK's navigation policy is dropped before any surface draws it.

```text
Requests over time: Count of records by @timestamp per hour, from 98 to 210.

@timestamp per hour | Count of records
00:00 | 120
01:00 | 98
```

On Slack, `metric` and `xyChart` are the pack's `slackAssetTypes`. With `collectAssets`, each chart becomes an `image` block and an upload request for a `snapshot` render of the node, with its text as the alt text, cut to Slack's limit. Without it, a chart is its Markdown converted to Block Kit. A `dataTable` is not an asset type: it is always a native `table` block. A `grid` keeps its nested charts' pictures: its title is a header, each section a container, and each panel title a header above its node.

## `grid`

A `grid` draws its panels on 48 columns with CSS grid, one row unit `CHARTS_THEME.grid.rowHeight` pixels tall. A grid's or panel's title and description are its header, each one line of text, and the node draws below. Panels are in [reading order](grid.md) in the markup, so a screen reader and the one-column layout read them alike.

When the context carries a `size` narrower than 768 px, the grid draws one column in reading order instead. Each panel's node gets a context with the `size` its panel leaves it, and draws at that size. Without a `size` from the host, the grid keeps 48 columns and sizes each panel's node for `CHARTS_THEME.grid.nominalWidth`, the content width of `chartsFrame`, 928 px, so a chart still fits its panel's height and a grid on `snapshot` fits its page; a browser lays the grid out fluidly, and a host that wants one column on a narrow screen measures the grid and passes its `size`. A grid nested in a panel of such a grid keeps 48 columns too: only a width that comes from the host switches a grid to one column.

On `snapshot`, each nested node receives the frame theme, so charts inside a grid draw the frame's scheme. `metrics.snapshotHeight` sums the grid's header, the rows, section headers and gaps at full width. Text, Markdown and Slack list the panels in reading order under their section titles; a collapsed section is its title alone. On `react`, each panel of a collapsed section is a hidden, empty element carrying its node anchor, so anchors pair with the grid's `children`, which keep every panel for validation.

## `chartsFrame`

`chartsFrame` is a [frame](../runtime/frame.md) for drawing charts on `snapshot`. A host registers it with the runtime and names it per render, or makes it the `defaultFrame`:

```ts
import { chartsFrame, chartsPack } from '@elastic/isomer-primitives-charts';

const runtime = createIsomerRuntime({
  packs: [chartsPack],
  frames: { charts: chartsFrame },
});

runtime.surfaces.snapshot.render(composition, { frame: 'charts', theme: 'dark' });
```

The page is 960 px wide with 16 px of padding, so its content is 928 px, the grid's nominal width. It draws the composition's title and subtitle, one line each at 20 px and 14 px, then each body node, in a column with 16 px between each. Its sizing is `content`: the image is as tall as the page lays out, and `estimateHeight` is the padding, the title and subtitle lines, each node's `metrics.snapshotHeight` and the gaps between them. Every length is in `CHARTS_THEME.frame`.

Its theme, `ChartsFrameTheme`, is `{ scheme, background, text }` per mode: the scheme charts resolve for, and the page's background and text colors from the Scene's chrome for that scheme. [A runtime's frames share one theme type](../runtime/frame.md#a-runtime-is-homogeneous-in-its-theme), so a runtime that registers `chartsFrame` beside another frame gives that frame's theme these keys too.

## `unsupported`

An `unsupported` node draws a note with its title, reason and link, in the page's text color. Text and Markdown write the same three. A link that fails the SDK's navigation policy is dropped.
