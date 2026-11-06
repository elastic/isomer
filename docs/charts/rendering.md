---
navigation_title: Rendering
description: How the charts pack draws a chart node through a SceneRenderer, and how a host chooses which one.
---

# Rendering

Every chart primitive's `react` renderer is a shim. It resolves the node to a [Scene](scene.md), picks a `SceneRenderer`, and hands it the Scene. The shim draws nothing itself, so replacing how a chart is drawn is configuration: primitives, compositions and materializers stay the same.

```ts
import { chartsPack, createChartsPack } from '@elastic/isomer-primitives-charts';

createIsomerRuntime({ packs: [chartsPack] }).validate(composition);

const drawingPack = createChartsPack({
  resolveScene,
  sceneRenderers: [elasticChartsNode],
});
```

`chartsPack` registers `metric`, `xyChart`, `grid` and `unsupported` with their defaults. It validates every node and draws `grid` and `unsupported`; drawing a chart node needs a `resolveScene`, which `createChartsPack` takes, and drawing one without it throws.

`resolveScene` turns a node into its Scene: `(node, { scheme, size?, locale?, timeZone? }) => Scene`.

## Choosing a renderer

For each chart node, the shim tries renderers in this order and takes the first that runs in the render's environment and supports the Scene's kind:

1. `context.sceneRenderers`, the host's preference for this render;
2. the pack's `sceneRenderers`, given to `createChartsPack`;
3. the pack's fallback, which supports every kind.

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
| `locale`, `timeZone` | Passed to the resolver. Absent: the resolver's defaults, and each date format's own time zone |
| `size` | The box the chart draws in. Absent: the renderer's default size |

A host that loads the charts pack without a style adapter names the runtime's type parameters to pass these fields, as [Runtime](../runtime/runtime.md#typing-the-render-context) shows.

Off native, the shim puts the renderer's output in one `div` that carries the [node anchor](../sdk/rendering.md#node-anchors). On native it returns the renderer's output unwrapped, since native has no `div`.

## Text and Markdown

The `text` and `markdown` renderers take no render context. They resolve the Scene for the light scheme and write its `summary`.

## `grid`

A `grid` draws its panels on 48 columns with CSS grid, one row unit `CHARTS_THEME.grid.rowHeight` pixels tall. A panel's title is its header and its description is the header's tooltip; the node draws below. Panels are in [reading order](grid.md) in the markup, so a screen reader and the one-column layout read them alike.

When the context carries a `size` narrower than 768 px, the grid draws one column in reading order instead. Each panel's node gets a context with the `size` its panel leaves it, so a chart resolves its ticks for that box. Without a `size` the grid passes none on: a browser lays it out fluidly.

On `snapshot`, each nested node receives the frame theme, so charts inside a grid draw the frame's scheme. `metrics.snapshotHeight` sums the rows, section headers and gaps at full width. Text and Markdown list the panels in reading order under their section titles; a collapsed section is its title alone.

## `unsupported`

An `unsupported` node draws a note with its title, reason and link, in the page's text color. Text and Markdown write the same three.
