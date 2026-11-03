---
navigation_title: Metric
description: How a Lens metric binds to an Isomer metric node, and what is refused.
---

# Metric

`bind` turns a Lens metric (`lnsMetric`) into a [`metric` node](../charts/metric.md) that draws what Lens draws from the same saved state and response. The reference is Kibana's metric `toExpression`, the `metricVis` renderer and its runtime converters, read as a specification of the saved format; no Kibana code is imported.

## State

Saved state is first converted the way Lens converts it on every render:

- `valuesTextAlign` fills `primaryAlign` and `secondaryAlign` when they are unset.
- `secondaryPrefix` becomes `secondaryLabel` when that is unset.
- `titleWeight` is dropped.
- With a color or palette and no `applyColorTo`, the color targets the background.
- An unset `density` is `compact`.
- With a secondary metric, an empty `secondaryLabel` hides the label; otherwise the label shows `before` the value unless `secondaryNameVisibility` or `secondaryLabelPosition` says otherwise.

A key Lens does not define is `unsupported`, so new Lens state is reported rather than dropped.

## Tiles

| Lens                               | Node                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No breakdown                       | One tile from the first row, titled by the metric's name and subtitled by `subtitle`. No rows is one tile reading `null`.                                                                                                                                                                     |
| `breakdownByAccessor`              | A tile per row in response order, titled by the formatted breakdown value and subtitled by the metric's name; `subtitle` is ignored. A missing value reads `(null)` and an empty one `(blank)`. Keys are the JSON of the raw value, with `#2`, `#3` for repeats. No rows draws an empty grid. |
| `collapseFn` on a numeric metric   | The breakdown is ignored and the metric, secondary and max collapse into one tile with `sum`, `avg`, `min` or `max`, skipping null cells.                                                                                                                                                     |
| `maxCols`                          | `columns`.                                                                                                                                                                                                                                                                                    |
| Column name                        | The custom label when `customLabel` is set, otherwise the field name.                                                                                                                                                                                                                         |
| `params.format`                    | `number`, `percent`, `bytes` and `bits`, with `decimals`, `compact` and `suffix`, on number columns only. With no format, a number reads as the host's default pattern does.                                                                                                                  |
| `color`, `applyColorTo`            | `color` and `colorTarget`. A text tile always paints its background, as Lens does.                                                                                                                                                                                                            |
| No color or palette                | Lens's `getDefaultColor`: `{ token: 'valueText' }` on a painted value, and `{ token: 'progress' }` on a tile while `showBar` is on; a progress bar keeps the resolver's own default.                                                                                                          |
| Custom `palette`                   | A concrete `#rrggbb` per tile: stops from `params.stops`, bounds from the data as `getDataBoundsForPalette` gives them, and `workoutColorForValue`'s range and continuity rules.                                                                                                              |
| Named `palette`                    | A band of the same palette, `{ palette, step, of }`, with `steps` (or one per saved stop, or 5) bands spread evenly over the data bounds. The charts theme gives the band its color.                                                                                                          |
| Palette names                      | Colors follow the palette's `name`, as `getOverridePaletteColors` regenerates them; saved stop positions apply only when `params.name` is `custom`, as `computePaletteParams` reads it.                                                                                                       |
| Layout                             | `titlesTextAlign`, `primaryAlign`, `secondaryAlign`, `primaryPosition`, `valueFontMode` and `density` map to `layout`.                                                                                                                                                                        |
| `showBar` with `maxAccessor`       | A progress bar to the row's max, `vertical` unless `progressDirection` is `horizontal`. A null max is 0, as d3 reads it, so the bar fills halfway as Lens's does.                                                                                                                             |
| Trend layer                        | A sparkline from the trend layer's time and metric columns, matched to tiles by raw breakdown value, sorted by time, with null readings kept as gaps. With `collapseFn`, rows collapse by time. Trend wins over progress.                                                                     |
| Breakdown tile with `filterAction` | `{ name: filterAction, filters: [{ field, value }] }` with the breakdown's field and raw value.                                                                                                                                                                                               |

## Form-based layers

A form-based metric binds from the same state, with Lens's form-based rules on top:

- A tile is named by its column's label, custom or generated, as the table's `name` gives it.
- A `static_value` max collapses with `max`, so the bar keeps the value its author set.
- A `terms` breakdown pads the grid to its `size`, plus one for the Other bucket, with `placeholders`; a `filters` breakdown pads to its number of filters.
- The `__other__` and `__missing__` buckets read as the table's terms format labels them; without one, Other reads `Other` and a missing bucket `(null)`.
- `filterAction` raises a field = value filter only for a single-field `terms` bucket. Other and missing buckets, multi-field terms, `filters` and `range` buckets are refused for now.
- A number column with no Lens format and a data view format of its own is refused for now.

## Secondary metric

| Lens                          | Node                                                                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No trend                      | The formatted reading and its label.                                                                                                                                                     |
| `static`                      | A badge in the saved color. A non-numeric secondary is always static.                                                                                                                    |
| `dynamic` against a number    | The secondary's own reading, with a badge colored and marked ↑, ↓ or = by its sign against the baseline.                                                                                 |
| `dynamic` against the primary | `primary − secondary` in the secondary's format, with a `+` unless it rounds to zero, colored by its sign. A missing side reads `N/A` with the middle color.                             |
| Palettes                      | `compare_to` reads `danger`, `default`, `success`; `complementary` reads `primary`, `default`, `warning`; `temperature` reads `primary`, `default`, `danger`; `reversed` swaps the ends. |
| `visuals`                     | `icon` drops the value and `value` drops the glyph. An icon-only badge with no direction draws no badge.                                                                                 |

A missing secondary reading reads `(null)`, as Kibana's formats print it.

## Refused

| Code                                                     | When                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `lens.bind.unsupported-visualization`                    | The saved object is not a metric.                                                        |
| `lens.metric.unsupported-state`                          | The state has a key Lens does not define.                                                |
| `lens.metric.unsupported-format`                         | A `duration`, `custom` or other format.                                                  |
| `lens.metric.unsupported-palette`                        | A palette that is not one of Lens's value palettes, or one with more than 5 bands.       |
| `lens.metric.unsupported-icon`                           | A tile icon.                                                                             |
| `lens.metric.unsupported-filter-value`                   | `filterAction` is set and a breakdown bucket needs more than a field = value filter.     |
| `lens.metric.unsupported-multivalue`                     | A multivalue or object reading.                                                          |
| `lens.metric.unsupported-date`                           | A date metric, secondary or breakdown, which needs the host's date format and time zone. |
| `lens.metric.unsupported-progress-domain`                | A progress max that is not a number or null.                                             |
| `lens.metric.unrepresentable`                            | The bound node fails the metric schema, for example more than 10,000 tiles.              |
| `lens.metric.missing-table`, `missing-column`            | A table or accessor column is missing (`invalid`).                                       |
| `lens.metric.duplicate-trend-time`, `invalid-trend-time` | A trend has two points at one instant, or a row without a timestamp (`invalid`).         |

## Native ES|QL trends

When Lens renders an ES|QL metric with a sparkline, it rebuilds the trend layer's query from the main layer's query (`buildTrendlineQueryWithMetricFieldMap`). `bind` reads the trend layer as it was saved. A host that wants exact parity after the main query has changed without the panel being saved again must rebuild the trend query the same way before running it.
