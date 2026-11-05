---
navigation_title: Format
description: "The default formatter for chart values: portable formats as ECMA-402 Intl options, with a formatter a host can replace."
---

# Format

`@elastic/isomer-primitives-charts/format` turns a cell and its [`PortableFormat`](core.md#portableformat) into the string every surface shows. The Scene resolver calls it, and renderers never format.

```ts
import { formatValue } from '@elastic/isomer-primitives-charts/format';

formatValue(5150000, { kind: 'bytes', maximumFractionDigits: 1 }); // '4.9 MB'
formatValue(
  '2019-05-05T14:04:56.201Z',
  { kind: 'date', month: 'long', day: 'numeric', timeZone: 'America/Phoenix' },
  { locale: 'fr' }
); // '5 mai'
```

Formats are `Intl` options, so they mean the same thing in any JavaScript host and follow the chart's `locale`:

| `kind` | How |
| --- | --- |
| `number` | `Intl.NumberFormat` with the format's fraction digits, `signDisplay`, `useGrouping` and `notation` |
| `percent` | `Intl.NumberFormat`'s `percent` style. A `percent` with `fractional: false` holds percentages, not fractions |
| `bytes`, `bits` | The largest unit the value is at least one of (bytes up to petabytes, bits up to terabits), by `base` 1024 for bytes and 1000 for bits unless stated, with `Intl.NumberFormat`'s unit names |
| `duration` | The value in `output`, or with `auto` (the default) in the largest unit it is at least one of, with `Intl.NumberFormat`'s unit names. A month is 30 days and a year 365 |
| `date` | `Intl.DateTimeFormat` with the format's styles or fields, in the format's `timeZone` or the chart's. With neither styles nor fields, a medium date and time. Cells are epoch milliseconds or ISO 8601 strings |
| `text` | The value as a string |

A missing value is `(null)`, an empty string `(blank)`, and a number-like value that is not a number `NaN`. A multivalue cell becomes a JSON array of its formatted values, such as `["1,000","2,000"]`. A `suffix` is appended to the whole result.

`formatValue(value, format, { locale?, timeZone?, labels? })` defaults to `en` and `UTC`. `labels` replaces any of the three missing-value texts. `defaultFormatFor(type)` gives a column without a format its default: at most three decimals for numbers, and a medium date and time for dates.

## Replacing the formatter

A host with its own formats passes a `ChartFormatter` to `resolveChart`:

```ts
type ChartFormatter = (
  value: Cell | undefined,
  format: PortableFormat,
  context: { locale: string; timeZone: string; labels: FormatLabels; column?: string }
) => string;
```

`intlFormatter` is the default. Kibana passes one backed by its field formats service, so charts it resolves print exactly what Kibana prints; a value no portable format can describe can also travel as a `data.display` string.

## Time zones and environments

The formatter needs `Intl.NumberFormat` and `Intl.DateTimeFormat` with time-zone support, as browsers and Node.js have. An unknown time zone throws a `RangeError` rather than formatting in another zone. A client whose `Intl` lacks time zones, such as some React Native builds, renders a Scene resolved on a server.
