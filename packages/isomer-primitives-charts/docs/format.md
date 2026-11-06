---
navigation_title: Format
description: "How chart values print: portable formats as ECMA-402 Intl options, applied by the Scene resolver."
---

# Format

The Scene resolver turns each cell and its [`PortableFormat`](core.md#portableformat) into the string every surface shows. Renderers never format, and the formatter is not exported: a node's text depends only on the node and the `locale` and `timeZone` it is resolved in.

Formats are `Intl` options, so they mean the same thing in any JavaScript host and follow the chart's `locale`:

| `kind` | How |
| --- | --- |
| `number` | `Intl.NumberFormat` with the format's fraction digits, `signDisplay`, `useGrouping` and `notation` |
| `percent` | `Intl.NumberFormat`'s `percent` style. A `percent` with `fractional: false` holds percentages, not fractions |
| `bytes`, `bits` | The largest unit the value is at least one of (bytes up to petabytes, bits up to terabits), by `base` 1024 for bytes and 1000 for bits unless stated, with `Intl.NumberFormat`'s unit names |
| `duration` | The value in `output`, or with `auto` (the default) in the largest unit it is at least one of, nanoseconds up to years, with `Intl.NumberFormat`'s unit names. Zero stays in its input unit. A month is 30 days and a year 365 |
| `date` | `Intl.DateTimeFormat` with the format's styles or fields, in the format's `timeZone` or the chart's. With neither styles nor fields, a medium date and time. Cells are epoch milliseconds or ISO 8601 date-times with a UTC offset |
| `text` | The value as a string |

A missing value is `(null)`, an empty string `(blank)`, and a value that is not a number in a numeric format `NaN`. A multivalue cell becomes a JSON array of its formatted values, such as `["1,000","2,000"]`. A `suffix` is appended to the whole result, but not to a missing or empty value's label. Zero never prints as `-0` unless the format's `signDisplay` is `always`.

A column without a format gets its type's default: at most three decimals for numbers, and a medium date and time for dates. A `maximumFractionDigits` below `minimumFractionDigits` is raised to it. A date format that states only `hour12` or `timeZone` keeps the medium date and time default. Unparseable dates and numeric dates outside ±8.64e15 epoch milliseconds print as their raw values.

## Formats a host has that Isomer does not

A host with formats no portable format describes, such as Kibana's field formats, maps each to the nearest portable format when it builds the node, or sends `data.display` strings and records a `losses` entry. It does not format at render time.

Unsupported or invalid locale tags fall back to English, independent of the host locale.

## Time zones and environments

Formatting needs `Intl.NumberFormat` and `Intl.DateTimeFormat` with time-zone support, as browsers and Node.js have. An unknown time zone throws a `RangeError` rather than formatting in another zone. A client whose `Intl` lacks time zones renders a Scene resolved on a server.
