---
navigation_title: dataTable
description: Rows and columns to read exactly, as Lens's data table and Discover sessions draw them.
---

# `dataTable`

Rows and columns to read exactly, on the [chart core](core.md). Lens data tables and Discover sessions materialize into it. Each row of `data` is one table row.

| Field | What it is |
| --- | --- |
| `columns` | The columns shown, in order: `column`, `alignment?`, `width?`, `decoration?`, `summary?`. Absent means every data column in data order |
| `columns[].decoration` | `{ kind: 'text' \| 'background' \| 'badge', colors }`, colored by value range (`bands`) or cell value (`byKey`); or `{ kind: 'bar', color?, colors?, min?, max?, baseline? }` |
| `columns[].summary` | A footer: `kind` (`sum`, `avg`, `count`, `min`, `max`) and `label?` |
| `pageSize` | Rows per page. Absent means one page |
| `density` | `compact`, `default` or `expanded` |
| `interactions`, `emphasis` | Selectable `cell`s, a link, the starting `initial.sort`, and static highlights: [Interactions](interactions.md) |

Rules:

- Every column reference names a column in `data.columns`.
- Each data column is listed in `columns` at most once.
- A `bar` decoration and a `summary` need a `number` column.
- A `byKey` key is a cell value as a string with each `\` and `:` preceded by `\`, as the [chart core](core.md) encodes a key part; a missing, blank or multivalue cell is never colored. A number inside a band takes the band's color first.
- Emphasis rows are indexes into `data.rows`.

## How it resolves

The Scene's `kind` is `table`. Expected values come from Lens's datatable and Kibana's field formats:

- **Column `role`** sets the row header: the first `dimension` shown. Only `dimension` cells are selectable, as `cell`.
- **Empty cells:** a missing value is `-`, titled `(null)`; an empty string is `(blank)`. Both are drawn subdued (EUI `darkShade`) and never decorated. A column whose every cell is empty is flagged `empty`, so a renderer may hide it.
- **Alignment:** right for `number` columns and left for any other, unless set; a bar is never centered.
- **Decorations:** text on a colored cell or badge is EUI `textGhost` on a dark color and `textInk` on a light one, as Lens's `getContrastColor`, judging a translucent color after compositing over the row's background. A bar spans the column's lowest to highest value (or `min`–`max`), anchored at zero when every value is the same, filled from `baseline`; its default color is `euiColorVis2`.
- **Sorting:** every column's ascending and descending orders are in the Scene (`orders`), as `@kbn/sort-predicates` orders them: missing values last in both directions, strings by the text they show (their `display` string, else their formatted value), dates by time, multivalue cells element by element. `order` is the starting order.
- **Summary:** over every non-null value, arrays flattened; `count` uses the default number format, the others the column's; the label is Lens's ("Value count", "Sum", "Average", "Minimum", "Maximum"). With no value, an average, minimum or maximum is `-`.
- **Emphasis:** an emphasized row is filled with EUI `backgroundBasePrimary`.
- **Paging:** EUI's pager, "Rows per page: 10". A table with no rows shows "No results found".

## Surfaces

No chart engine draws a table, so the pack does: its table renderer draws the title and description, the first page in the starting order as an HTML table, then each emphasis note and the link, the same in the browser and on `snapshot`. The table is laid out as Lens's data grid: a shaded header, horizontal rules, the row header's cells as row headers, emphasized rows filled, the footer and the pager. Every color is the Scene's and every length is `CHARTS_THEME`'s. A host renderer that supports the `table` kind replaces it. Without a Scene `size`, the table is its title, description, header, first page, footer, pager, notes and link tall, and `snapshotHeight` reports that height; with one, it draws the rows that fit. Text and Markdown write the summary and the table, footer row last, in `data` order. Slack gets the summary, description and notes, then a native `table` block of the Scene's strings in the starting order, capped at Slack's 100 rows and 20 columns, rather than a picture, then the link. Interactive sorting, paging and cell selection in the browser belong to the interactive renderers.

`dataTableExamples` covers a sorted table with an Other bucket, every decoration, missing, blank, multivalue and all-empty cells, paging with a summary, huge, tiny and negative values, chosen columns with pre-rendered values and provenance, and no rows.
