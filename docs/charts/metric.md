# Metric

`metric` shows one headline reading, or one per breakdown value as a grid of tiles.

```ts
type MetricNode = {
  type: 'metric';
  tiles: MetricTile[]; // in display order; keys unique; none is an empty grid
  columns?: number; // tiles per row, default 3
  layout?: {
    titleAlign?: Align; // default 'left'
    valueAlign?: Align; // default 'right'
    valuePosition?: 'top' | 'middle' | 'bottom'; // default 'bottom'
    valueSize?: 'default' | 'fit';
    density?: 'compact' | 'default';
  };
};

type MetricTile = {
  key: string;
  title?: string;
  subtitle?: string;
  value: number | string | null; // null reads N/A
  format?: ValueFormat; // number | percent | bytes | bits | pattern | duration
  color?: ColorRef; // a tone or #rrggbb
  colorTarget?: 'background' | 'value'; // default 'background'
};
```

Tile counts, columns and text share one cap of 10,000; renderers truncate text that does not fit.

## Colors

A `ColorRef` is a theme tone or a `#rrggbb` color.

## Painting

These follow Elastic Charts' `Metric` chart:

- A tile fills with its color.
- `colorTarget: 'value'` paints the value text instead.

Text colors are picked for contrast with the fill.

## Drawing it in another engine

`resolveMetric` gives each tile its formatted strings, fill and text colors. A renderer then only lays them out. With Elastic Charts as the reference:

| Field | Elastic Charts | Another engine |
| --- | --- | --- |
| value, format | `value` + `valueFormatter` | text |
| title, subtitle | `title`, `subtitle` | text |
| color, colorTarget | `color`, or `valueColor` with the background | fill or text color |
| layout | the theme's `metric` alignments, `valuePosition`, `valueFontSize`, `spacing` | text alignment and placement |
| columns | the `data` grid | rows of tiles |
