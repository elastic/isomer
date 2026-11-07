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

The page needs Elastic Charts' stylesheet for the Scene's scheme, `theme_light.css` or `theme_dark.css`; without it a chart measures zero and draws nothing. Kibana always loads it.

`@elastic/charts`, React and React DOM are peer dependencies, so a host shares its own copy: Kibana's pin is the version this engine is tested against (`ELASTIC_CHARTS_VERSION`).

## One spec builder

`sceneSpecs(scene, env, options?)` turns a `metric` or `xy` Scene into Elastic Charts spec elements: `Settings`, axes, series, reference lines and annotations in the Scene's layer order, or the metric grid. The renderer wraps them in `<Chart>`; headless drawing hands the same elements to Elastic Charts' `collectSpecs`, so a chart drawn in a browser and one drawn on a server come from one place.

## What it takes from the Scene

Colors, text, series and draw order are the Scene's. Ticks, domains, stacks and point density are Elastic Charts', computed from the intent each Scene axis and series states, the way Kibana's xy expression hands them over. A tick label prints through `formatAxisValue`, so it reads the same in every engine.

| Elastic Charts input | From the Scene |
| --- | --- |
| Base theme | Kibana's charts base theme for the Scene's `scheme`: Elastic Charts' Borealis theme with the `Elastic UI Numeric` font first and axis titles in the tick-label color at weight 500, as Kibana's charts plugin builds it |
| Background, axis, tick, grid-line and title colors | `chrome` |
| Series colors, names and draw order | `series` |
| Stacking | Unstacked `y` with `stackAccessors`; a `percentage` stack sets `stackMode: 'percentage'` |
| y domain | `custom` is `{ min, max }`; `data` is `fit: !includeZero` with the axis's reference lines in `includeDataFromIds`, as Kibana's `getAxisDomain` builds it |
| x domain | The `categories` in order on an ordinal axis; `custom` is `{ min, max }`; otherwise Elastic Charts' own |
| Rounding | `xNice` and `yNice` from each axis's `domain.rounding` |
| Points | `points`: `auto`, `visible` and `hidden` are `'auto'`, `'always'` and `'never'` |
| Time zone | The x axis's `timeZone`, else the Scene's |
| Tick labels | A category's `label` on an ordinal axis; any other value through `formatAxisValue` |
| Value labels | The mark's `label` |
| Tooltip | The x position as its axis labels it, then each hovered series' name, color and mark `label` |
| Legend position, layout, size, title and truncation | `legend` |
| Reference lines and annotations | `referenceLines` and `annotations`, styled as Kibana's xy chart styles them |
| Metric tiles, layout and alignment | `tiles` and `layout`, as Kibana's metric visualization sets them; the value prints the tile's `value.text` |
| Accessible label and description | `title` and `summary` |

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
| xy | `interactions.initial.hiddenSeries` and `legend.items[].hidden` are not applied: Elastic Charts has no public initial deselection | Hidden series draw until a reader toggles them |
| xy | Annotation and reference-line icons and text markers are not drawn | Lines and fills only |
| xy | `currentTime` is not drawn: the Scene gives it no color | No current-time marker |
| xy | `interactions.emphasis` and `sync` are not drawn | No static highlight or synced cursor |
| xy | `partial` marks are not shaded | No end-zone shading |
| metric | `layout.icon` is not drawn: Elastic Charts takes an icon component, and the Scene names an EUI icon | No tile icon |
| metric | Title and subtitle colors are Elastic Charts' contrast choice against the tile background | Title color may differ from the Scene's `chrome.text` |
| metric | A progress bar draws `progress.fraction` against a domain of 1 | Bar length matches; Elastic Charts' accessible progress text reads the fraction |
| both | Pixel layout (margins, label placement, legend width) | Geometry compared within tolerance, not exactly |

`link` is drawn by the primitive around the renderer, not inside the chart.
