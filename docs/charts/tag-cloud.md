---
navigation_title: tagCloud
description: Words sized by value, as Lens's tag cloud draws them.
---

# `tagCloud`

Words sized by value, on the [chart core](core.md). Lens's tag cloud materializes into it. Each row of `data` is one word.

| Field                      | What it is                                                                                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tags`                     | `column`: the words, each its cell as displayed                                                                                                                                                                              |
| `metric`                   | `column`: the `number` column whose values size the words                                                                                                                                                                    |
| `scale`                    | How a value's place between the smallest and largest becomes a font size: `linear` (default), `log` (its base-2 logarithm plus one) or `squareRoot`                                                                          |
| `orientation`              | `single` (default) sets every word horizontally; `rightAngled` turns some a quarter turn; `multiple` turns them to one of 12 angles from horizontal to a quarter turn the other way. Each word's angle follows from its text |
| `fontSize`                 | `min` and `max` in pixels, default 18 and 72, as Lens's                                                                                                                                                                      |
| `showLabel`                | Write "_tags label_ - _metric label_" under the cloud. Default true                                                                                                                                                          |
| `interactions`, `emphasis` | Selectable `tag`s, a link and static highlights: [Interactions](interactions.md)                                                                                                                                             |

A `colors.byKey` key names a tag by its `tags` cell, as a key part (the missing bucket is `\null`); a tag with none takes the default categorical palette by the first row it shows in, as Lens ranks it. A missing metric value draws the word at the smallest size. Words that do not fit are left out, as Lens leaves them. A chart with no rows says "No results found".

Rules:

- Every column reference names a column in `data.columns`.
- The `metric` column is a `number` column.
- The `tags` and `metric` columns are not `multivalue`.
- The `tags` and `metric` columns are two different columns.
- `fontSize.min` is at most `fontSize.max`.
- Emphasis rows are indexes into `data.rows`.

## How it resolves

The Scene's `kind` is `tagCloud`. Expected values come from Lens's tag cloud (`expression_tagcloud`):

- **Words**, one per row in row order: its text the `tags` cell as displayed (its `display` string, else its format), its `valueText` the metric cell as displayed, and its `weight` its value's place from the smallest (0) to the largest (1), as Lens's `calculateWeight` gives it: a lone word weighs 1, and a missing value, or every value the same, 0.
- **Colors:** a tag's `colors.byKey` entry, else the categorical palette by the first row it shows in, so a tag repeated takes one color.
- **Layout intent:** `scale`, the font sizes, and the angles words may take as Lens's `ORIENTATIONS` state them (`count` evenly spaced from `start` to `end`); the engine places the words.
- **Text:** each word's description names its tag and value; the summary sentence counts the tags and names the three largest.
- **Selections:** each word carries a `tag` selection when the node offers it: its row, the `tags` column and its cell.

## Surfaces

The [Elastic Charts engine](../charts-elastic/index.md) draws it with Elastic Charts' `Wordcloud` in the browser. On Node it draws only through a host's engine that collects the same specs (`sceneSpecs`); without one, `snapshot`, and so a Slack picture, draws the pack's [fallback](rendering.md#choosing-a-renderer), the summary sentence. Without a host size it takes a 16:9 box, as an `xyChart` that fills its container does, and `snapshotHeight` reports it. Text and Markdown write the summary, the description, each emphasis note and the data table. On Slack it is a picture asset, as the other charts are.

`tagCloudExamples` covers ten words in the default palette, right-angled words with stated colors and the Other and missing buckets, many angles on a log scale, numbers as tags with missing values, one tag, no rows, and selectable words with pre-rendered names, emphasis, a link and provenance.
