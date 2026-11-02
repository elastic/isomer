---
description: Host-owned chart themes, portable projections, standalone defaults, and the Elastic Charts/Kibana boundary.
---

# Theme ownership

The application owns the theme. Isomer does not have a global design system from
which every pack inherits: the slides theme belongs to its private reference
pack and fixed slide canvas, not to chart hosts.

`ChartsTheme` is an engine-free, resolved presentation value. Its colors and
`tokens` travel together through React, HTML and the snapshot frame. A host should
derive them from its application theme, not maintain a second chart palette.
Authored tile/palette colors still override host defaults. Accent, secondary and
status paints used by the contrast helper are opaque six-digit hex; surface
colors can use the engine's CSS color notation.

## What is a default

| Value | Owner |
| --- | --- |
| `chartsThemes` | Standalone portable fallback light/dark colors. Not EUI, Kibana, or Elastic Charts defaults |
| `chartsThemes.light.tokens` | Standalone baseline: system font, 16px base font, 4px spacing unit |
| `createChartTokens(source)` | Portable layout roles derived from the host's base typography and spacing |
| `elasticChartsThemes` in the browser package | Projection of installed Elastic Charts light/dark defaults; standalone semantic status colors are explicitly inherited from the portable fallback |
| Authored metric layout | The composition: alignment, density, value position and fit/default font policy |

`createChartTokens` supplies a baseline for rendering without browser text
measurement. Its font roles are relative to the base font, and padding/gaps/radius
are multiples of the spacing unit. Frame width, tile height and trend viewport
are standalone layout policies, not values extracted from Lens or Elastic Charts.
The host can replace those roles after derivation. Stroke, area opacity, point
radius and minimum value-font size are projected from the engine by the browser
adapter. No algebra can turn a baseline SVG layout into the engine's responsive
text-measurement algorithm; the baseline is an explicit adaptation.

For example, derive host layout with
`createChartTokens({ fontFamily: app.fontFamily, fontSize: app.fontSize, space: app.space })`,
then pass it to the browser package's `projectElasticChartsTheme`. Pass the same
resulting light/dark pair to `createChartsStyleAdapter` and `createChartFrame`.
Geometry and text styles are inline in the shared React tree so collection does
not accidentally replace host tokens with module-level constants.

## Elastic Charts and Kibana

Elastic Charts 73.3.2 already supplies named base themes, visualization colors,
typography, contrast choices and metric layout defaults. It measures metric text
against the available viewport. The browser renderer inherits that behavior:
it does not force Arial, a 40px value, a 16px minimum, hardcoded text contrast,
or un-authored spacing/alignment over the engine.

At Kibana revision `e44f3ef4b8f6427d1827dba2097cbb6a10e6e925`,
the [chart theme service](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/src/platform/plugins/shared/charts/public/services/theme/theme.ts)
calls `getChartsTheme(coreTheme)` with the application's theme name and dark mode,
clones the engine theme before Kibana-specific adjustments, and exposes it
through `useChartsBaseTheme`.
The [metric component](https://github.com/elastic/kibana/blob/e44f3ef4b8f6427d1827dba2097cbb6a10e6e925/src/platform/plugins/shared/chart_expressions/expression_metric/public/components/metric_vis.tsx)
uses that base theme and EUI surface/track colors, then applies persisted metric
settings such as density, alignment, font policy and value position.

Isomer follows that ownership boundary without importing Kibana or requiring EUI
in the portable pack. A Kibana host supplies its already-resolved chart theme,
application status colors and typography/spacing. A non-Kibana host supplies its
own equivalents. Good/bad colors cannot be inferred from an arbitrary
visualization palette: status semantics belong to the host.

The [browser adapter](../renderers-elastic-charts/index.md) accepts
the host's engine base theme and projects the fields needed by HTML/snapshot.
This is not a claim that the standalone fallback or baseline layout is Kibana's
theme, nor evidence of real Lens visual parity.
