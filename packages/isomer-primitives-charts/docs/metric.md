# Metric

`metric` shows one headline reading, or one per breakdown value as a grid of tiles. Each tile can add a secondary reading.

```ts
type MetricNode = {
  type: 'metric';
  tiles: MetricTile[]; // in display order; keys unique; none is an empty grid
  columns?: number; // tiles per row, default 3
  layout?: {
    titleAlign?: Align; // default 'left'
    valueAlign?: Align; // default 'right'
    secondaryAlign?: Align; // default 'right'
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
  secondary?:
    | {
        kind: 'value';
        label?;
        labelPosition?;
        value?: number | string;
        format?;
        badge?: { color: ColorRef; direction?: 'up' | 'down' | 'flat' };
      }
    | {
        kind: 'change';
        label?;
        labelPosition?;
        previous: number;
        increase?: 'good' | 'bad' | 'neutral';
        show?: 'absolute' | 'relative';
      };
};
```

Tile counts, columns and text share one cap of 10,000; renderers truncate text that does not fit.

## Colors

A `ColorRef` is a theme tone or a `#rrggbb` color.

## Secondary readings

`kind: 'value'` shows a reading the author or a lowering has already resolved, with an optional badge. Use it to reproduce Lens settings such as a static badge color, a comparison with the primary metric, or a reversed palette.

`kind: 'change'` compares the tile's numeric value with `previous`. The resolver derives the direction, the glyph (↑, ↓ or =), the badge color from `increase`, and the reading:

- `relative` (the default) is the percentage change, `delta / |previous|`, with a sign. When `previous` is 0 it falls back to `absolute`.
- `absolute` is the difference in the tile's own format, with a sign.

With `increase: 'good'` a rise is green and a fall red. `'bad'` swaps them, and `'neutral'` keeps every direction grey, as Lens's default comparison palette does.

## Painting

These follow Elastic Charts' `Metric` chart:

- A tile fills with its color.
- `colorTarget: 'value'` paints the value text instead.

Text colors are picked for contrast with the fill.

## Drawing it in another engine

`resolveMetric` gives each tile its formatted strings, fill, text colors and badge colors. A renderer then only lays them out. With Elastic Charts as the reference:

| Field | Elastic Charts | Another engine |
| --- | --- | --- |
| value, format | `value` + `valueFormatter` | text |
| title, subtitle | `title`, `subtitle` | text |
| color, colorTarget | `color`, or `valueColor` with the background | fill or text color |
| secondary, badge | `extra` (`SecondaryMetricProps`) | text in a rounded fill |
| labelPosition `tooltip` | `labelTooltip` | a tooltip where the platform has one, else an accessibility label |
| layout | the theme's `metric` alignments, `valuePosition`, `valueFontSize`, `spacing` | text alignment and placement |
| columns | the `data` grid | rows of tiles |
