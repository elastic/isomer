---
navigation_title: xyChart
description: Lines, areas and bars over a shared x axis, with reference lines and annotations.
---

# `xyChart`

Lines, areas and bars over a shared x axis, on the [chart core](core.md).

| Field                      | What it is                                                                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `orientation`              | `vertical` (default) or `horizontal`, which puts x on the vertical axis                                                                                                          |
| `layers`                   | Drawn in order. `data`, `referenceLines` and `annotations` layers                                                                                                                |
| `axes`                     | `x`, `y` and `y2`: `title?`, `ticks?`, `grid?`, `labelOrientation?`, `scale?`, `domain?`, `rounding?`; `x` also `interval?`, the bucket width                                    |
| `legend`                   | `visibility`, `position`, `inside` (a corner), `layout`, `columns`, `maxLines`, `size`, `statistics`, `seriesHeader`                                                             |
| `interactions`, `emphasis` | Selection, brushing, sync, a link, series hidden at first, and static highlights: [Interactions](interactions.md)                                                                |
| `style`                    | `interpolation`, `fitting`, `points`, `areaOpacity` (0 to 1, default 0.3), `areaFill`, `barMinimumHeight`, `barValueLabels`, `partialBuckets` (the queried range), `currentTime` |

Values and defaults, where a field is absent:

| Field                                      | Values                                                                | Absent means                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `layers[].stack`                           | `stacked`, `percentage`                                               | unstacked                                                                            |
| `layers[].y[].axis`                        | `y`, `y2`                                                             | `y`                                                                                  |
| `axes.*.ticks`, `axes.*.grid`              | boolean                                                               | `true`                                                                               |
| `axes.*.labelOrientation`                  | `horizontal`, `angled` (45°), `vertical` (90°)                        | `horizontal`                                                                         |
| `axes.x.scale`                             | `ordinal`, `temporal`, `linear`                                       | by the x column's type: `temporal` for `date`, `linear` for `number`, else `ordinal` |
| `axes.x.domain`                            | `{ kind: 'fit' }`, `{ kind: 'custom', min, max }`                     | `fit`                                                                                |
| `axes.y.scale`, `axes.y2.scale`            | `linear`, `log`, `sqrt`                                               | `linear`                                                                             |
| `axes.y.domain`, `axes.y2.domain`          | `{ kind: 'full' }`, `{ kind: 'fit' }`, `{ kind: 'custom', min, max }` | `full`: the data, extended to zero for bars and areas                                |
| `axes.*.rounding`                          | boolean                                                               | `true`                                                                               |
| `legend.visibility`                        | `auto`, `visible`, `hidden`                                           | `auto`: shown with more than one series                                              |
| `legend.position`                          | `top`, `bottom`, `left`, `right`                                      | `right`                                                                              |
| `legend.inside`                            | `top_left`, `top_right`, `bottom_left`, `bottom_right`                | outside the plot                                                                     |
| `legend.layout`                            | `list`, `grid`                                                        | `list`                                                                               |
| `legend.columns`                           | 1 to 5, for a legend `inside` the plot                                | 1                                                                                    |
| `legend.maxLines`                          | 1 or more                                                             | 1                                                                                    |
| `legend.size`                              | `auto`, `s` (80 px), `m` (130), `l` (180), `xl` (230)                 | `auto`                                                                               |
| `style.interpolation`                      | `linear`, `smooth`, `stepped`                                         | `linear`                                                                             |
| `style.fitting.kind`                       | `none`, `zero`, `linear`, `carry`, `lookahead`, `average`, `nearest`  | `none`                                                                               |
| `style.fitting.emphasize`                  | boolean                                                               | `false`                                                                              |
| `style.fitting.extend`                     | `none`, `zero`, `nearest`                                             | `none`                                                                               |
| `style.points`                             | `auto`, `visible`, `hidden`                                           | `auto`                                                                               |
| `style.areaFill`                           | `solid`, `gradient`                                                   | `gradient`                                                                           |
| `style.barMinimumHeight`                   | pixels                                                                | 1                                                                                    |
| `style.barValueLabels`                     | boolean                                                               | `false`                                                                              |
| Reference line `axis`                      | `x`, `y`, `y2`                                                        | `y`                                                                                  |
| Reference line `strokeWidth`, `strokeDash` | 1 to 10 px; `solid`, `dashed`, `dotted`                               | 1, `solid`                                                                           |
| Reference line `textPosition`              | `auto`, `left`, `right`                                               | `auto`                                                                               |
| Range annotation `fill`                    | `inside`, `outside`                                                   | `inside`                                                                             |

A `data` layer is `{ kind: 'data', mark: 'line' | 'area' | 'bar', stack?, x?, y: [{ column, axis?, color? }], splitBy?, rows? }`. Every data layer uses the same `x` column; when it is absent, every row draws at one x position. When layers come from different source tables, the tables are appended to `data` in layer order, each layer names its `[start, end)` row range, and each table's x field maps to the one x column, in one date encoding when it is a `date` column.

`axes.x.interval` is the bucket width in x units, milliseconds on a time axis, which a materializer reads from the aggregation that built the x column, as Kibana's `calculateMinInterval` does. A bucket draws as partial when it crosses an edge of `style.partialBuckets`, and an engine sizes bars by the interval, as Elastic Charts' `minInterval` does. Without it, the resolver takes each layer's smallest spacing between x values for partial buckets, and the engine infers its own. It is a fixed width, so calendar months and years, and days across a daylight-saving change, are approximate, as `minInterval` is. It is ignored on an ordinal axis.

Reference lines sit at fixed values; annotations are points or ranges at fixed times. Both can carry a [glyph](core.md#glyphs) `icon`. Neither carries rows, so neither is ever selected.

A series key, for `colors.byKey` and `interactions.initial.hiddenSeries`, is the y column id without `splitBy`; with `splitBy` it is the split cell, which for a `date` column is the first row's cell among those showing one instant, prefixed by the y column id and ":" when the layer has more than one y column or more than one data layer has `splitBy`. Series that share a key, such as two layers plotting one y column, share its `colors.byKey` entry and hidden state. The y column id and the split cell are each a key part. A key part is the value as a string with each `\` and `:` preceded by `\`; a missing (null) cell is the key part `\null`, and a multivalue cell is `\` followed by the key part of its JSON text, such as `\["a"]`; no string produces either.

Rules:

- Every column reference names a column in `data.columns`.
- On a continuous x scale, stated or inferred from the x column type, each non-missing x cell is a finite number for `linear`, or epoch milliseconds or an ISO 8601 date-time with a UTC offset for `temporal`.
- The `x`, `y` and `splitBy` columns are not `multivalue`.
- A `date` column holds one encoding: every non-missing value is epoch milliseconds, or every one is an ISO 8601 date-time.
- A `y` column is a `number` column.
- A layer's `rows` is a `[start, end)` range within `data.rows`, with `start` at most `end`.
- Only `bar` and `area` layers stack.
- At least one layer is a `data` layer.
- Every data layer uses the same x column; absent means every row draws at one x position.
- An annotation range's `from` is not after its `to`.
- A time written as a string is an ISO 8601 date-time with a UTC offset, such as `2026-11-03T00:30:00Z`, as a `date` cell is.
- A `custom` axis domain has `min` below `max`, and on a `log` y axis `min` above zero.
- A `brush` column is a `date` or `number` column used as `x` by at least one `data` layer.
- Emphasis rows are indexes into `data.rows`.

## Time axis

On a vertical chart with a `temporal` x scale, the x axis draws as Lens's does: minor labels beside the plot (`14:00`, `3rd`, `Nov`) over major labels that name each day, month or year (`November 3, 2026`). The resolver decides those ticks and labels with Elastic Charts' multi-layer time-axis rules, and the Scene carries them ([Time axes](scene.md#time-axes)). They come from four things the node and the resolve options state, and nothing else. A materializer reproducing a Lens panel states them as Lens hands them to Elastic Charts (`expression_xy/public/components/xy_chart.tsx` and `x_domain.tsx`):

| What                  | State it as                                                                                       | From Lens                                                                                                                                                                                                                                                                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A time axis           | `axes.x.scale: 'temporal'`, and `orientation: 'vertical'`                                         | Lens's x scale is `time` (`isTimeChart`: a date histogram x). A date x that Lens draws on an `ordinal` scale states `ordinal`. Horizontal bars (`orientation: 'horizontal'`) get no multi-layer axis, in Lens or here: their ticks print in the x column's format, to which the materializer maps Lens's x formatter (`dateFormat:scaled`) |
| The domain            | `axes.x.domain: { kind: 'custom', min, max }`                                                     | `getXDomain`'s `extendedDomain` (`Settings.xDomain`), unchanged: with lines and areas, `max` is already one bucket past the last; with bars it is not, and the resolver adds the bucket as Elastic Charts does. Without a domain, the resolver spans the drawn x values, as Elastic Charts does when Lens passes `NaN` bounds              |
| The bucket            | `axes.x.interval`, in milliseconds                                                                | `extendedDomain.minInterval`: for calendar units (`d`, `w`, `M`, `y`), `getAdjustedInterval`'s value, not the nominal one. A stated interval wider than the data's smallest spacing yields to that spacing, as `minInterval` does                                                                                                          |
| The zone and language | The x column format's `timeZone`, else `resolveChart`'s `timeZone`; and `resolveChart`'s `locale` | `dateFormat:tz`, resolved to an IANA zone (`Browser` becomes the viewer's zone), which Lens gives each series as `timeZone`; and `i18n.getLocale()`, which Lens gives `Settings.locale`                                                                                                                                                    |

The x column's own date format does not change the axis labels, nor do `dateFormat:scaled` or `dateFormat:dow`: Elastic Charts labels a multi-layer axis with its own `Intl` formats, and Lens passes no `dow`, so weeks start on Monday. The column's format still prints table cells, tooltips and selections. `axes.x.labelOrientation` does not apply either: the labels draw level, as Lens passes its multi-layer axis no `labelsOrientation`.
