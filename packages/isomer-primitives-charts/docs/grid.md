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

## Exports

On `./schema` and the root entry:

| Export | What it is |
| --- | --- |
| `gridSchema` | The `grid` schema with its panel nodes unresolved, for standalone validation |
| `gridSchemaFor` | The `grid` schema bound to a composition's body-node union |
| `GridNode` | A `grid` node |
| `GridPanel` | A node placed on the grid, at `x`, `y` with size `w` by `h` in grid units |
| `GridSection` | A titled group of panels, positioned by `y` and optionally collapsed |
| `gridReadingOrder`, `GridReadingEntry` | Every panel in reading order, each a `GridReadingEntry`: the panel and the field path of its node |
| `gridCatalog` | What an agent reads to choose `grid`: purpose, when to use it, and an example |
| `gridExamples` | Its named examples: panels side by side, and sections |
| `GRID_RULES` | Its cross-field rules, one sentence each, as the schema's description states them |
| `GRID_COLUMNS` | Columns across a grid: 48 |
| `GRID_SINGLE_COLUMN_BELOW` | The width in pixels below which a grid renders as one column: 768 |
