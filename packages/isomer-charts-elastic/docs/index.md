---
navigation_title: Elastic Charts engine
description: A SceneRenderer that draws chart Scenes with Elastic Charts in the browser, as Kibana draws its panels.
---

# Elastic Charts engine

`@elastic/isomer-charts-elastic` draws [chart Scenes](../../isomer-primitives-charts/docs/scene.md) with [Elastic Charts](https://github.com/elastic/elastic-charts), the library Kibana draws its panels with, so a chart in a browser host looks like the Kibana panel it came from. It is a `SceneRenderer` for the browser and supports the `metric` and `xy` kinds.

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

With `onEvent` and a node id, a gesture raises the event of the Scene part it lands on, through the Scene's [selections](../../isomer-primitives-charts/docs/scene.md#selections-and-events). Elastic Charts' own indexes and values are never used.

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
