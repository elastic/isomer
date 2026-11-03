---
navigation_title: Comparison with Kibana
description: Capture Lens panels from a real Kibana and check that Isomer draws them as Kibana does.
---

# Comparison with Kibana

The comparison gate checks that Isomer draws a Lens panel as Kibana does, given the same saved state and the same data. It replays panels captured from a real Kibana through `plan`, `readResponse` or `readTable` and `bind`, draws them with the charts pack's renderer, and compares the drawing with Kibana's field by field. It lives in the package's unpublished `comparison/` folder: nothing in it is part of the published package.

`pnpm test:browser`, and so `pnpm verify`, fails when a captured panel no longer plans and binds, or draws differently from Kibana's capture beyond its feature's tolerance.

## What a case holds

Each case is one panel in one color scheme, in `comparison/__fixtures__/<id>/`:

- `case.json`: the panel's saved state as a `plan` input, with metadata for the data views it references; the data Lens drew it from, per layer; the context it was drawn in (scheme, time zone, date format, locale, device scale, platform and time range); provenance (the Kibana version and build, its Elastic Charts version and the digests of its font files); and the fingerprint of Kibana's drawing.
- `reference.png`: the panel's drawing as Kibana showed it.

For an ES|QL layer, the data is the Elasticsearch response with the columns Lens's `dropNullColumns` request dropped restored, which is what a host's own request returns. For a form-based layer, it is the `Datatable` Lens logged for the layer. `comparison/__fixtures__/fonts/` holds the font files Kibana served, with their licenses, and `comparison/__fixtures__/index.ts` bundles everything for the Studio. All of it is written by the capture.

## Capturing

Capture runs against a local, credential-free Elasticsearch and Kibana, never in CI. The compose file also starts the Linux Chromium the capture drives, so Kibana draws text as CI's Chromium draws Isomer's:

```sh
docker compose -f packages/isomer-lowering-lens/comparison/capture/compose.yml up -d
pnpm comparison:capture
```

`STACK_VERSION` picks the stack's image tag (default `9.7.0-SNAPSHOT`) and `PLAYWRIGHT_VERSION` the browser's, which must match the repository's `@playwright/test`. `KIBANA_URL` is Kibana as the capture's API calls reach it, `KIBANA_BROWSER_URL` as the browser reaches it, and `CAPTURE_BROWSER` the browser's endpoint. The capture installs the Flights, Logs and eCommerce sample data if they are missing, imports the dashboards in `comparison/capture/scenarios.ts`, and captures every supported panel of every dashboard in light and dark, each scheme in its own browser that Kibana follows. It replaces `comparison/__fixtures__/` entirely, so review its diff like any baseline update.

The sample dashboards cover what Kibana ships. The authored dashboards cover what they do not: formats with decimals and suffixes, secondary metrics and comparisons, breakdowns with Other and empty grid cells, progress bars past their maximum, static and palette colors, icons, alignment and density, empty, null, negative, huge, tiny, multivalue and date readings, long titles, and trendlines. Add a panel there to cover a new case.

Sample data rebases its timestamps when it is installed, so each capture uses a fixed range around its own day and records it.

## Keeping the cases current

The cases are a baseline: they record what one Kibana drew, and they go stale when what Isomer compares against moves. Recapture when:

- the renderer's `@elastic/charts` pin changes. `comparison/fixtures.test.ts` fails until every case was drawn by the pinned release, so capture against a Kibana that ships it;
- `@playwright/test` changes. The same test fails until `PLAYWRIGHT_VERSION` in `capture/compose.yml` matches, since the capture's browser must be the one CI draws with;
- the fingerprint, the scenarios or the capture change;
- a new Kibana changes how Lens saves or draws a metric, which the cases record in their provenance.

Recapturing replaces `comparison/__fixtures__/` entirely. Review the `case.json` diffs before committing: a reference that moved is either a Kibana change to follow or a capture problem to fix, and never a reason to loosen a tolerance.

## The fingerprint

A fingerprint is what a drawing shows, read from its DOM. The same extractor reads Kibana's drawing and Isomer's. For the metric, each tile records its grid position and box, its title, subtitle, extra text and reading, the widths those texts draw at, in full and for the runs outside Kibana's numeric font face, their font sizes, where each text sits in its block as drawn (falling back to its computed alignment when it fills the block), which side its icon is on, its background and value colors, its secondary metric and badge, its progress bar's value, range, orientation and where its fill starts and ends along the track, and its sparkline's points, with a new subpath at each gap. Because one extractor reads both drawings, it could miss a field on both sides at once; the replay test therefore also checks every tile's texts in Kibana's drawing against Isomer's resolved model, which does not go through the extractor.

## Tolerances

Every field belongs to one feature, and each feature has one tolerance. A case cannot carry a tolerance of its own.

| Feature | Fields | Tolerance | Largest measured |
| --- | --- | --- | --- |
| `text`, `color`, `identity`, `layout.align`, `trend.shape` | Texts, colors, positions, tile count, alignment, trend subpaths and point counts | Exact | — |
| `layout.font`, `trend.geometry`, `progress.value`, `progress.geometry` | Font sizes, sparkline points, progress value, range and fill | Exact | 0 |
| `layout.box`, `context.size` | Tile boxes, chart size | 1 CSS pixel, for CSS grid rounding | 0.25 px |
| `layout.text` | Text widths | 1 CSS pixel | 1 px on Linux |

The largest measured column is the largest difference across every case on Linux and macOS, which the browser test prints on each run. A tolerance is set from it, never loosened for one case.

The comparison also fails when the drawing's color scheme or device scale is not the case's. Text widths depend on how the platform rasterizes text, so they are compared only on the platform the case was captured on, Linux; elsewhere, such as a local macOS run, a text width difference is listed as not compared rather than failing.

## Known gaps

`comparison/known_gaps.ts` lists the differences Isomer does not close yet, each keyed by a feature and its fields, never by a case, with the reason. A difference a gap covers is shown but does not fail the comparison. Close a gap by fixing the feature, then delete its entry.

One gap is open: Kibana's charts theme puts its `Elastic UI Numeric` font before Inter, and Isomer's chart tokens follow Elastic Charts' default stack. Digits, spaces and the punctuation that font covers draw in Inter, so the full width of any text containing one of them differs, which is most titles and every reading. The gap covers those full widths only: the width of the runs outside that font is compared for every text.

## Held-out cases

One case in four, chosen by a hash of its dashboard and panel, is held out. The Studio lists only the others unless **Include held-out cases** is checked; the browser test runs them all. Keep held-out cases out of the material you tune against.

## The Studio app

**Lens comparison** (`#/app/lens-comparison/<case>`) shows Kibana's drawing beside Isomer's, or Isomer's over Kibana's with an opacity slider, at the panel's size and with Kibana's fonts. It lists every difference with its feature, Kibana's value, Isomer's, the resolved model's where it has one, and any gap that covers it. The model column tells lowering from rendering: when the model already holds Isomer's value, the bound node was wrong; when it holds Kibana's, the drawing was. Switch the Studio to the case's color scheme to compare it.

## Adding a panel type

A new kind of panel adds a fingerprint kind in `comparison/fingerprint/` with its extractor and feature classes, the panel type to the capture's supported set, and its replay. A chart Elastic Charts draws on a canvas has no DOM to read; its extractor reads Elastic Charts' `debugState`, which Kibana enables with `window._echDebugStateFlag`.
