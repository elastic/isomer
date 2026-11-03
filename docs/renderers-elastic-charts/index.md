# Elastic Charts renderers

`@elastic/isomer-renderers-elastic-charts` draws the [chart primitives](../charts/index.md) with Elastic Charts in the browser.

| Export               | What it is                                                                              |
| -------------------- | --------------------------------------------------------------------------------------- |
| `elasticChartsPack`  | The charts pack, drawn with Elastic Charts.                                             |
| `MetricChart`        | The metric as a component: `node`, optional `onEvent`, optional `scheme`.               |
| `elasticChartsReset` | The part of EUI's global reset Elastic Charts relies on, as CSS, for hosts without EUI. |

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { elasticChartsPack } from '@elastic/isomer-renderers-elastic-charts';
import '@elastic/charts/dist/theme_only_light.css';

const runtime = createIsomerRuntime({ packs: [elasticChartsPack] });
```

The host loads Elastic Charts' stylesheet once. Colors come from the chart tokens through the chart's theme, so the light stylesheet serves both schemes. Elastic Charts also relies on EUI's global reset; a host without EUI adds `elasticChartsReset` to its styles, or tiles overflow and clip.

## Scheme

A chart follows the host's `color-scheme` where it is drawn, falling back to the operating system's preference. It repaints when that preference changes or when an attribute changes on the chart's element or an ancestor, shadow hosts included, such as a theme class or inline style. `MetricChart`'s `scheme` fixes it instead.

## Server rendering

Elastic Charts measures its container in the browser. Until the chart mounts, including in the `html` surface and on `snapshot`, it renders each tile's reading as a list item. There is no server-drawn chart.

## Actions

A tile with an `action` raises it through the render context's `onEvent`. Without `onEvent`, or when no tile has an action, the chart is inert. Elastic Charts makes a whole chart interactive or none of it, so when only some tiles have an action, the others still show as clickable but raise nothing.

## Size

A chart fills its host's height. When the host's height is indefinite, the chart is `rowHeight` tall per row of tiles (`chartTokens.light.rowHeight`).

## Anchors

The pack's renderer marks its root with `nodeAnchor`, so `findNodeElementPairs` and `checkLayout` find metric nodes.
