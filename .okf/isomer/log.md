# Change log

## 2026-11-06

- **Outcome**: Chart resolution preserves authored cell text, per-layer x mappings and visible metric overlays. Mixed x-column types use an ordinal fallback; explicit continuous scales diagnose incompatible coordinates. Numeric and date arrays use their first non-null coordinate; singleton calendar-day domains, point density and wall-clock rounding follow the documented contracts.
