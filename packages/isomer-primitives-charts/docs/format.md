---
navigation_title: Format
description: "The one formatter every renderer and surface uses: Kibana's numeral, duration and Moment date formats, in plain JavaScript."
---

# Format

`@elastic/isomer-primitives-charts/format` turns a cell and its [`PortableFormat`](core.md#portableformat) into the string every surface shows. It is the only formatter: the Scene resolver calls it, and renderers never format.

```ts
import { formatValue } from '@elastic/isomer-primitives-charts/format';

formatValue(5150000, { kind: 'bytes', pattern: '0,0.[000]b' }); // '4.911MB'
formatValue('2019-05-05T14:04:56.201Z', {
  kind: 'date',
  pattern: 'MMMM Do YYYY, HH:mm:ss.SSS',
  timeZone: 'America/Phoenix',
}); // 'May 5th 2019, 07:04:56.201'
```

It matches Kibana's field formats for text, and its tests use the expected strings from Kibana's own field format tests unchanged.

| `kind` | How |
| --- | --- |
| `number`, `percent`, `bytes`, `bits` | `@elastic/numeral`, the library and locales Kibana uses, in the format's `locale` (`en` when absent or unknown). `alwaysShowSign` adds `+` only when the value does not round to zero. A `percent` with `fractional: false` holds percentages, not fractions |
| `duration` | Kibana's duration format: Moment's duration arithmetic and its English `humanize`, and Kibana's `humanizePrecise`. `decimals` defaults to 2 |
| `date` | A Moment.js pattern in an IANA time zone, a fixed offset such as `+05:30`, or `UTC`, with Moment's English names, ordinals and weeks. Cells are epoch milliseconds or ISO 8601 strings |
| `text` | The value as a string |

Every kind follows Kibana for missing values: `null` is `(null)`, and an empty string is `(blank)` where Kibana's format says so. A multivalue cell becomes a JSON array of its formatted values, such as `["1,000","2,000"]`. A `suffix` is appended to the whole result.

`defaultFormatFor(type, timeZone)` gives a column without a format Kibana's default: `0,0.[000]` for numbers and `MMM D, YYYY @ HH:mm:ss.SSS` for dates.

## Where `Intl` is used, and the fallback

The formatter runs in browsers, on servers and on React Native's Hermes, whose `Intl` support differs by platform. So it uses `Intl` for one thing only: the wall-clock fields of an instant in an IANA time zone, read from `Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', … }).format()` as numbers. It never uses `formatToParts`, zone or month names, `NumberFormat` options, `PluralRules` or `RelativeTimeFormat`.

Everything else is plain JavaScript. `UTC` and fixed offsets such as `+05:30` need no `Intl` at all. An IANA zone in an environment without `Intl.DateTimeFormat`, or a zone it does not know, throws a `RangeError` rather than formatting in another zone.

## Limits

- Names (months, weekdays, AM/PM, ordinals, `humanize` phrases) are English, as Moment's default locale is. Numbers follow the format's numeral `locale`.
- Moment's `z` token prints `UTC`, or the offset such as `+01:00`, where Moment Timezone prints an abbreviation such as `CET`.
- Weeks (`w`, `gggg`) start on Sunday, as Moment's English locale does; `W` and `GGGG` are ISO weeks.
