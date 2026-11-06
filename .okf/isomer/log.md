# Change log

## 2026-11-06

- **Outcome**: Chart resolution preserves authored text, per-layer x mappings and visible metric overlays; mixed x types use an ordinal fallback. Continuous scales validate coordinates at the data-cell path, while numeric and date arrays use their first non-null coordinate. Calendar domains stay within the Date range, wall-clock ticks remain aligned, and automatic points use projected gaps. Brush descriptions use the brush column’s plotted values and labels.
