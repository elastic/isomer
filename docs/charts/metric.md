# Metric

`metric` shows one headline reading, or one per breakdown value as a grid of tiles. Each tile can add a secondary reading, and either a trend or a progress bar.

```ts
type MetricNode = {
  type: 'metric';
  tiles: MetricTile[]; // in display order; keys unique; none is an empty grid
  placeholders?: number; // empty cells after the tiles, default 0
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
  visual?:
    | {
        kind: 'trend';
        points: { x: number; y: number | null }[];
        shape?: 'area' | 'bars';
      }
    | {
        kind: 'progress';
        max: number;
        min?: number;
        direction?: 'horizontal' | 'vertical';
      };
  action?: {
    name: string;
    filters?: (
      // what Lens filters a bucket by
      | { field: string; value: Raw } // a value
      | { field: string; values: Raw[]; negate?: boolean } // any, or none, of the values
      | { field: string; exists: boolean } // a missing bucket: exists: false
      | { field: string; range: { gte?: number; lt?: number } } // a range bucket
      | { query: string | Json; language: 'kuery' | 'lucene' } // a filters bucket
    )[];
    context?: Json;
  };
};
```

Tile counts, columns, placeholders and text share one cap of 10,000; renderers truncate text that does not fit.

## Formats

A format is `number`, `percent`, `bytes` or `bits`, each with optional `decimals` (default 2) and `suffix`, and `compact` for `number` and `percent`; a `pattern` with any numeral pattern; or a `duration`:

| Option | Meaning | Default |
| --- | --- | --- |
| `from` | The unit the value is in, from `picoseconds` to `years`. | `seconds` |
| `to` | `humanize` (`an hour`), `humanizePrecise` (`1.50 hours`), or a fixed unit such as `asMinutes`. | `humanize` |
| `decimals` | Decimal places of a precise or fixed-unit reading. | 2 |
| `short` | Short unit names, such as `min`. | `false` |
| `showSuffix` | Name the unit after a fixed unit's number, as Lens's duration format does. | `true` |
| `spaceBeforeSuffix` | Put a space before the unit. | `true` |

For example, `{ kind: 'duration', from: 'milliseconds', to: 'asSeconds' }` reads 1500 as `1.50 seconds`. Durations read English whatever locale the host set for `moment`.

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

- A tile with no visual fills with its color.
- A trend tile also fills with its color and draws the sparkline in a shade of it, as Elastic Charts' `getSparkLineColor` computes. With fewer than two points, or no reading above 0, Elastic Charts draws no line but still paints the tile as a trend tile.
- A progress tile keeps the chart background and fills the bar with its color, defaulting to Lens's progress blue. Its ratio is d3's `scaleLinear` over `[min, max]`, clamped: an empty range fills halfway and a `max` below `min` fills from the far end. It needs a numeric or missing `value`, and text, Markdown and server readings add how full it is, such as `75% of 512.0GB`.
- `colorTarget: 'value'` paints the value text instead, on tiles without a visual.

Text colors are picked for contrast with the fill.

## Drawing it in another engine

`resolveMetric` gives each tile its formatted strings, fill, text colors, badge colors, trend points with gaps kept, and progress ratio. A renderer then only lays them out. With Elastic Charts as the reference:

| Field | Elastic Charts | Another engine |
| --- | --- | --- |
| value, format | `value` + `valueFormatter` | text |
| title, subtitle | `title`, `subtitle` | text |
| color, colorTarget | `color`, or `valueColor` with the background | fill or text color |
| secondary, badge | `extra` (`SecondaryMetricProps`) | text in a rounded fill |
| labelPosition `tooltip` | `labelTooltip` | a tooltip where the platform has one, else an accessibility label |
| trend | `trend`, `trendShape` | an area or step path over the tile's lower half, broken at `null` |
| progress | `domainMax`, `domainMin` when not 0, `progressBarDirection`; `minReading` and `maxReading` label the ends | a filled bar |
| layout | the theme's `metric` alignments, `valuePosition`, `valueFontSize`, `spacing` | text alignment and placement |
| columns, placeholders | the `data` grid, padded with `undefined` cells | rows of tiles, then empty cells |
| action | `onElementClick` | a press handler |
