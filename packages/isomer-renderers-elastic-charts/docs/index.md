---
navigation_title: Elastic Charts renderer
description: Browser metric/trend rendering, shared React fallback, and matched real Lens capture gate.
---

# Elastic Charts renderer

`@elastic/isomer-renderers-elastic-charts` binds the
[portable metric/trend contract](../../isomer-primitives-charts/docs/index.md)
to Elastic Charts 73.3.2. It has no `@kbn/*` dependency, does not interpret Lens
saved objects and does not execute queries. React and React DOM 18 are required
peers because that is the supported Elastic Charts peer target; Zod remains a
peer rather than a bundled copy.

## Browser integration

```ts
import '@elastic/charts/dist/theme_light.css';

import {
  chartsPack, createChartFrame, createChartsStyleAdapter,
} from '@elastic/isomer-primitives-charts';
import {
  elasticChartsRendererOverrides, elasticChartsThemes,
} from '@elastic/isomer-renderers-elastic-charts';
import { createIsomerRuntime } from '@elastic/isomer-runtime';

const runtime = createIsomerRuntime({
  packs: [chartsPack],
  frames: { chart: createChartFrame(elasticChartsThemes) },
  styleAdapter: createChartsStyleAdapter(elasticChartsThemes),
  rendererOverrides: elasticChartsRendererOverrides,
});
```

Load Elastic Charts' structural stylesheet in the browser host, not a Node
entry. The package root intentionally imports no CSS so CommonJS consumers can
load it. `MetricTrendChart` can also be mounted directly with a validated `node`,
`theme`, optional host `baseTheme`, and optional `context.onEvent`.

The browser inherits Elastic Charts' typography, responsive value sizing,
contrast and un-authored layout defaults. Only application surface styles and
explicit composition settings override them; there is no hardcoded Arial/40px
value or parallel browser visualization palette.

For an application host, obtain its resolved light/dark engine themes (for
example Kibana's chart theme service, which uses `getChartsTheme(coreTheme)`).
Use `projectElasticChartsTheme(base, mode, statusColors, tokens)` to create the
portable theme for each mode; `tokens` can come from `createChartTokens` with
the application's typography and spacing. Status colors are explicit because an
engine palette does not encode good/bad semantics. Pass the portable pair to
`createChartFrame` and `createChartsStyleAdapter`, and the engine pair to
`createElasticChartsRendererOverrides`. Direct mounts receive both `theme` and
`baseTheme`. Host themes are consumed without mutating engine singletons.

`elasticChartsThemes` is the standalone projection of installed engine defaults,
with fallback semantic status colors. The primitive pack's `chartsThemes` is
instead a standalone portable fallback, not an EUI/Elastic Charts theme.
See [Theme ownership and the Kibana comparison](../../isomer-primitives-charts/docs/theme.md).

The component renders `MetricView`, the pack's shared React tree, on the server
and initial hydration. After mount it supplies Elastic Charts tile content to
that same tree. Thus HTML/snapshot remain useful without a browser, actions and
tables keep one implementation, and there is no per-snapshot renderer or
headless rasterization dependency. A snapshot of this runtime is baseline
Isomer markup, **not an Elastic Charts browser screenshot**.

`Metric` receives numeric values and their formatter for progress; no gauge is
substituted and no NaN missing sentinel is required. Independent primary and
secondary sparklines use time scales and explicit gap handling, instead of
dropping nulls into an uninterrupted embedded Metric trend. The summary and
timestamp table remain available in both renderings. Explicit host buttons,
not pixel hit targets, own action events and keyboard behavior.

The repository shared Studio lazy-loads the app at `#/app/metric/`, alongside
slides, Decks and the native-ES|QL inspector. It accepts portable model JSON,
clears invalid/stale previews, shows diagnostics, and raises local action
feedback. It does not connect the Lens inspector to a chart. Images stay
disabled in the shared browser-only host.

## Public API

| Entry/export | Contract |
| --- | --- |
| Root `MetricTrendChart` | Mounted browser renderer; validated `MetricTrendNode`, optional portable `theme`, optional host engine `baseTheme`, optional `context` |
| Root `metricDatum(node, tile, theme)` | Pure adapter returning exact Elastic Charts `MetricDatum`, including secondary badges and optional progress |
| Root `elasticChartsRendererOverrides` | React-only runtime override map; no parsing, collection, fallback or inventory replacement |
| Root `createElasticChartsRendererOverrides` | Bind React overrides to a host-resolved light/dark engine theme pair |
| Root `projectElasticChartsTheme`, `ElasticChartsThemeSource` | Explicit engine-to-portable projection with a structural input, without leaking engine declaration internals |
| Root `elasticChartsThemes` | Standalone engine-default projections for consistent browser/HTML/snapshot setup |
| `/testing` `metricCaptureSchema`, `MetricCaptureFixture` | Version-1 closed fixture and inferred type for a sanitized authorized real Lens reference |
| `/testing` `compareMetricCapture` | Node-only matched-context semantic/pixel gate |
| `/testing` `MetricCapturePixels`, `MetricCaptureCandidate`, `MetricCaptureResult` | Decoded RGBA inputs, observed visible text, portable candidate model/context and explicit passed/failed result |

`metricDatum` exposes an inferred structural return, checked internally against
Elastic Charts' `MetricDatum`. Public declarations do not pull the engine's
implementation-only declaration graph into every host's typecheck.

## Real Lens reference gate

**No valid authorized sanitized real Lens capture is available in this slice.**
The prior chart-spike `probe_7.metric.*.reference.png` files were generated by
`family_charts.js` and `probe_7_reference.js` from standalone synthetic Elastic
Charts inputs. They are not Lens output. They cannot be paired with unrelated
metric examples or relabeled as real-reference evidence. No authenticated
system was accessed or captured.

The reusable `/testing` gate is implemented and unit-tested with generated
pixels, explicitly labeled as gate-mechanics tests. It accepts:

- A validated portable model paired with the real capture.
- Provenance identifying Lens, a pinned Kibana revision and Elastic Charts
  version, saved-object SHA-256, capture time/owner, authorization confirmation
  and sanitization account.
- Matching data, execution context, theme and font SHA-256 fingerprints;
  viewport, DPR, browser, locale and timezone.
- A reference's exact decoded RGBA digest/dimensions and independent meaningful
  required/forbidden visible text, pixel tolerance and its rationale.
- Actual candidate model/context, exact decoded RGBA dimensions and browser
  observed text; not a fresh summary generated from the candidate model.

It fails before pixel comparison for model/context/provenance/schema/digest/
dimension or semantic-expectation failures. Pixel comparison never crops,
rescales or masks content. A pixel differs when any RGBA channel exceeds the
declared tolerance; changed-pixel ratio must not exceed the fixture threshold.
Boundary tests independently exercise exact pass/fail thresholds, modified
data/theme/context, tampered pixels, missing semantics and unrelated models.
The schema caps tolerances; fixture authors still must justify them.

**Precise blocker:** an authorized owner must supply a sanitized Lens metric
saved object plus its matching output data, execution context, theme, fonts,
viewport/DPR, browser version, screenshot and meaningful independently recorded
semantic expectations. The later Lens binder must establish the mapping from
that saved object/data to this portable model. A trusted host decodes the
reference/candidate PNGs to RGBA and records actual visible text before calling
the gate. The metadata declaration is not proof of authorization or correct
mapping by itself. There is deliberately no automatically passing “missing
reference” case and no synthetic real-Lens fixture.

Current evidence proves source behavior, local Chromium rendering and packed
consumer integration only. It does not prove real Lens visual/semantic parity,
Elasticsearch execution, hosted preview acceptance or host-side image rendering.
