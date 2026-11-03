# Charts

`@elastic/isomer-primitives-charts` defines chart primitives that any engine can draw to match Elastic Charts: Elastic Charts itself in the browser, or another engine such as ECharts or a native renderer. It owns each chart's schema, the resolved model renderers draw from, the theme tokens, and the text and Markdown adaptations. It draws nothing itself.

| Entry                                     | What it holds                                                                                                                                                                                                                            |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@elastic/isomer-primitives-charts`       | `createChartsPack(renderers)` and the `ChartRenderers` contract.                                                                                                                                                                         |
| `@elastic/isomer-primitives-charts/model` | Each chart's schema, node type, resolver and examples, plus `chartTokens` and `formatValue`, which formats a number the way the resolver does. No React, DOM, Node built-ins, SDK or chart engine, so it loads anywhere JavaScript runs. |

## Building a pack

A pack needs a `react` renderer for every chart, which a renderer package supplies:

```tsx
import { createChartsPack } from '@elastic/isomer-primitives-charts';
import { resolveMetric } from '@elastic/isomer-primitives-charts/model';

const pack = createChartsPack({
  metric: (node) => <MyMetric resolved={resolveMetric(node)} />,
});
```

[`@elastic/isomer-renderers-elastic-charts`](../renderers-elastic-charts/index.md) exports that pack ready-made as `elasticChartsPack`. The pack sets no theme or style adapter, so it fits any runtime alongside other packs.

## Rules every chart follows

- **The spec says what to show.** Nodes carry readings, formats, colors and identities. Source-specific derivation, such as Lens collapse or data-relative palette bounds, belongs to the lowering that produces the node.
- **One resolver per chart.** `resolveMetric(node, scheme)` turns a node into formatted strings, concrete colors and defaults. Renderers map its output and never re-derive it, so every engine shows the same text and colors.
- **Elastic Charts is the visual reference.** `chartTokens` mirrors Elastic Charts' light and dark themes and EUI Borealis colors, and the Elastic Charts renderer's tests check them against the installed Elastic Charts themes.
- **Numbers read as Kibana reads them.** The resolver reproduces the numeral patterns Lens builds for its number, percent, bytes and bits formats, without `Intl`. A format the resolver cannot express, such as a custom numeral pattern or a duration, is the lowering's to report.
- **Actions are data.** An interactive mark carries an `action`: a name, the mark's identity as `filters` of field and raw value, and optional JSON `context`. Activating the mark raises `{ name, context: { ...context, key, filters } }` through the render context's `onEvent`. A mark without one is inert.

## Charts

- [Metric](metric.md)
