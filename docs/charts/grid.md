---
navigation_title: grid
description: Titled panels on a 48-column grid, in optional sections, as a Kibana dashboard lays them out.
---

# `grid`

Nodes placed on a 48-column grid, as a Kibana dashboard lays out its panels.

```ts
{
  type: 'grid';
  title?: string;
  description?: string;
  panels: GridPanel[];                // outside any section
  sections?: Array<{ id?; title; collapsed?; y; panels: GridPanel[] }>;
}

interface GridPanel {
  id?: string;
  title?: string;                     // the panel header, apart from the node
  description?: string;
  x: number; y: number; w: number; h: number; // grid units
  node: BodyNode;                     // any node, from any pack
}
```

A panel's title and description live on the panel, not inside its node, so a renderer can reflow, page or collapse headers without reading inside nodes. Positions are in grid units; a row unit's height is the renderer's. Section panels have `y` relative to the section's top.

**Reading order** is the top-level panels by `y`, then `x`, followed by each section by `y` with its panels by `y`, then `x`; ties keep array order. `gridReadingOrder(node)` returns it with each node's field path. Below `GRID_SINGLE_COLUMN_BELOW` (768 px, Kibana's mobile breakpoint) a grid renders as one column in reading order, and text, Markdown and Slack list panels in reading order.

**Geometry.** `GRID_GEOMETRY` holds the lengths the pack's renderer draws a grid with, in pixels, so a host that sizes a panel's content computes them instead of restating them:

| Field               | Value | What it is                                                                                                                           |
| ------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `rowHeight`         | 20    | One row unit                                                                                                                         |
| `gap`               | 8     | Between panels, across and down                                                                                                      |
| `sectionGap`        | 16    | Between the grid's blocks: its header, its top-level panels and each section. A section's title sits half of it, 8, above its panels |
| `nominalWidth`      | 928   | The width a grid lays out for when the host gives none, [`chartsFrame`'s content](rendering.md#chartsframe)                          |
| `headerHeight`      | 24    | A panel header with a title                                                                                                          |
| `descriptionHeight` | 18    | A grid or panel description line                                                                                                     |

A panel `w` columns wide in a grid `width` wide is `(width - (GRID_COLUMNS - 1) * gap) * (w / GRID_COLUMNS) + (w - 1) * gap` wide, with the tracks no narrower than zero; in the one-column layout every panel is `width` wide, whatever its `w`. A panel `h` rows tall is `h * rowHeight + (h - 1) * gap` tall, and its node draws in what its title and description leave: that height less `headerHeight` with a title and `descriptionHeight` with a description, and never less than zero, so a one-row panel with a title leaves its node no height.

## Example

The fewest fields that validate and draw, one full-width panel. A panel's `node` is declared on its own, typed as its primitive:

<!-- node-example -->

```ts
import type {
  GridNode,
  UnsupportedNode,
} from '@elastic/isomer-primitives-charts/schema';

const visitorsByOs: UnsupportedNode = {
  type: 'unsupported',
  title: 'Visitors by OS',
  reason: 'Vega visualizations cannot be shown here yet.',
};

const board: GridNode = {
  type: 'grid',
  panels: [{ x: 0, y: 0, w: 48, h: 8, node: visitorsByOs }],
};
```

A typical dashboard, titled, with two titled panels side by side and a section below them:

<!-- node-example -->

```ts
import type {
  GridNode,
  MetricNode,
  UnsupportedNode,
  XyChartNode,
} from '@elastic/isomer-primitives-charts/schema';

const requests: MetricNode = {
  type: 'metric',
  data: {
    columns: [
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [[14074]],
  },
  value: { column: 'count' },
};

const requestsOverTime: XyChartNode = {
  type: 'xyChart',
  data: {
    columns: [
      { id: 'time', label: '@timestamp', type: 'date', role: 'dimension' },
      {
        id: 'count',
        label: 'Count of records',
        type: 'number',
        role: 'metric',
      },
    ],
    rows: [
      ['2026-11-03T00:00:00Z', 120],
      ['2026-11-03T01:00:00Z', 98],
    ],
  },
  layers: [{ kind: 'data', mark: 'line', x: 'time', y: [{ column: 'count' }] }],
};

const visitorsByOs: UnsupportedNode = {
  type: 'unsupported',
  title: 'Visitors by OS',
  reason: 'Vega visualizations cannot be shown here yet.',
};

const webTraffic: GridNode = {
  type: 'grid',
  title: '[Logs] Web Traffic',
  panels: [
    { title: 'Requests', x: 0, y: 0, w: 12, h: 8, node: requests },
    {
      title: 'Requests over time',
      description: 'Hourly request count.',
      x: 12,
      y: 0,
      w: 36,
      h: 8,
      node: requestsOverTime,
    },
  ],
  sections: [
    {
      title: 'Details',
      y: 8,
      panels: [{ x: 0, y: 0, w: 48, h: 10, node: visitorsByOs }],
    },
  ],
};
```

Rules:

- A panel's `x + w` is at most 48.
- Panel and section ids are unique within the grid.
