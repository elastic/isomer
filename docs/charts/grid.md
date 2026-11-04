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

Rules:

- A panel's `x + w` is at most 48.
- Panel and section ids are unique within the grid.
