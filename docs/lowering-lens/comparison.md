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

Capture runs against a credential-free Elasticsearch and Kibana, locally or in the [recapture workflow](#keeping-the-cases-current), never in a pull request's CI. The compose file also starts the Linux Chromium the capture drives, so Kibana draws text as CI's Chromium draws Isomer's:

```sh
docker compose -f packages/isomer-lowering-lens/comparison/capture/compose.yml up -d
pnpm comparison:capture
```

`STACK_VERSION` picks the stack's image tag (default `9.7.0-SNAPSHOT`) and `PLAYWRIGHT_VERSION` the browser's, which must match the repository's `@playwright/test`. `ES_PORT`, `KIBANA_PORT` and `BROWSER_PORT` move the stack's host ports and `COMPOSE_PROJECT_NAME` its containers, so two stacks can run side by side. `KIBANA_URL` is Kibana as the capture's API calls reach it, `KIBANA_BROWSER_URL` as the browser reaches it, and `CAPTURE_BROWSER` the browser's endpoint. The capture reinstalls the Flights, Logs and eCommerce sample data, imports the dashboards in `comparison/capture/scenarios.ts`, and captures every supported panel of every dashboard in light and dark, each scheme in its own browser that Kibana follows. It replaces `comparison/__fixtures__/` entirely, so review its diff like any baseline update.

The sample dashboards cover what Kibana ships. The authored dashboards cover what they do not: formats with decimals and suffixes, secondary metrics and comparisons, breakdowns with Other and empty grid cells, progress bars past their maximum, static and palette colors, icons, alignment and density, empty, null, negative, huge, tiny, multivalue and date readings, long titles, and trendlines. Add a panel there to cover a new case.

Sample data rebases its timestamps around the day it is installed, so the capture installs it as of one fixed day, `SAMPLE_DATA_DAY` in `capture.spec.ts`, and reads every dashboard over a fixed range around it. The capture also passes that day to Kibana as `forceNow`, for panels with a relative time range of their own. Two captures from the same Kibana build write identical files; moving the day moves every date reading, trend and time range, so change it only on purpose. Chromium antialiases a panel's edge a level or two differently from run to run, so a screenshot within two levels per channel of the committed one keeps the committed file. The fingerprint, not the screenshot, is what the comparison checks.

## Keeping the cases current

The cases are a baseline: they record what one Kibana drew, and they go stale when what Isomer compares against moves. Recapture when:

- the renderer's `@elastic/charts` pin changes. `comparison/fixtures.test.ts` fails until every case was drawn by the pinned release, so capture against a Kibana that ships it;
- `@playwright/test` changes. Each case records the Playwright release and Chromium build it was captured with: the same test fails until the Playwright release matches, and the browser test until the Chromium replaying the cases is the build that captured them; it also checks that `PLAYWRIGHT_VERSION` in `capture/compose.yml` does, since the capture's browser must be the one CI draws with;
- the fingerprint, the scenarios or the capture change;
- a new Kibana changes how Lens saves or draws a metric, which the cases record in their provenance.

The `lens-recapture` workflow catches the last of these. Every Monday, and on demand, it starts the compose stack on `ubuntu-latest`, runs the capture and compares the result with the committed cases. A scheduled run uses compose's default `STACK_VERSION`, which has to move with Kibana's main branch; a manual run can name another. When only the Kibana build moved, it opens nothing: the new build saves and draws every case as the old one did, and the run's summary says so. When anything else moved, it runs the comparison's unit tests and browser gate against the new cases and opens a pull request from `lens-recapture/<branch>`, or updates the one already open. The pull request's description names the Kibana build and Elastic Charts release before and after, which cases changed and in what (saved state, data, context, fingerprint or screenshot), the fingerprint values that moved, and whether Isomer still matches. When Kibana draws with an Elastic Charts the renderer does not pin, it says so, since `comparison/fixtures.test.ts` fails until the pin follows. When Isomer no longer matches, the run fails after opening the pull request.

A pull request the workflow opens starts no CI of its own, so close and reopen it before merging.

Recapturing writes to `comparison/__fixtures__.next/` and replaces `comparison/__fixtures__/` with it only when every panel was captured, so a failed capture leaves the committed cases alone. Review the `case.json` diffs before committing: a reference that moved is either a Kibana change to follow or a capture problem to fix, and never a reason to loosen a tolerance.

## The fingerprint

A fingerprint is what a drawing shows, read from its DOM. The same extractor reads Kibana's drawing and Isomer's, and records two things per tile.

- **Every element the tile paints**: one with its own text, a fill, a border or a shadow, an SVG shape, or the progress meter. Each is keyed by its chain of Elastic Charts classes, such as `echMetric>echMetricText>echMetricText__valueBlock>echMetricText__value`, and records its computed color, background, border, radius, shadow, fill and stroke, font size, weight and family, and transform. It also records the opacity, filters, clips and blending its wrappers apply, which no element of its own shows, and an SVG shape's geometry as Chromium computes it, so a different glyph in the same box shows. An element that paints a fill, border or shape records its box relative to the tile, marked `holdsText` when text sizes it; an element with its own text records that text and where it is drawn, and, under an element that clips its overflow, the part left visible. An element clipping leaves none of is marked `hidden`. A moved, resized, recolored or restyled element, text aligned differently inside its box, a changed glyph, and an element one side draws and the other does not all show up without a field written for them.
- **Its readings**: title, subtitle, extra text, reading, secondary label and value, progress value and range, the sparkline's points with a new subpath at each gap, and whether its title is clickable, which Elastic Charts draws by wrapping it in a button left out of element keys.

Because one extractor reads both drawings, it could miss something on both sides at once, so the replay test also checks every tile's readings, and every color the model resolves, in Kibana's drawing against Isomer's resolved model, which does not go through the extractor.

## Tolerances

Every field belongs to one feature, and each feature has one tolerance. A case cannot carry a tolerance of its own.

| Feature | Fields | Tolerance | Largest measured |
| --- | --- | --- | --- |
| `text`, `color`, `paint`, `shape`, `identity`, `interactivity`, `visibility`, `trend.shape` | Texts, colors, borders, opacity, effects and transform, SVG geometry, which elements are drawn, tile count and positions, clickable titles, elements clipped away, trend subpaths and point counts | Exact | — |
| `layout.font`, `font.family`, `trend.geometry`, `progress.value` | Font sizes, weights and families, sparkline points, progress value and range | Exact | 0 |
| `layout.box`, `context.size` | Tile boxes, chart size | 1 CSS pixel, for CSS grid rounding | 0.25 px |
| `layout.element` | Painted boxes | 1 CSS pixel | 0.25 px |
| `layout.text` | Where text is drawn, and the part of it left visible | 1 CSS pixel | 1 px on Linux |

The largest measured column is the largest difference across every case, which the browser test prints on each run. A tolerance is set from it, never loosened for one case.

The comparison also fails when the drawing's color scheme or device scale is not the case's. Drawn text, painted boxes sized around text, and how Chromium serializes font families differ by platform, so they are compared only on the platform the case was captured on, Linux; elsewhere, such as a local macOS run, those differences are listed as not compared rather than failing. Tile boxes, progress tracks and fills, icons, sparklines, colors, texts, elements clipped away and everything else are compared on every platform.

## Known gaps

`comparison/known_gaps.ts` lists the differences Isomer does not close yet, each keyed by a feature and its fields, never by a case, with the reason. A difference a gap covers is shown but does not fail the comparison. Close a gap by fixing the feature, then delete its entry. None is open.

## Held-out cases

One case in four, chosen by a hash of its dashboard and panel, is held out. The Studio lists only the others unless **Include held-out cases** is checked; the browser test runs them all. Keep held-out cases out of the material you tune against.

## The Studio app

**Lens comparison** (`#/app/lens-comparison/<case>`) shows Kibana's drawing beside Isomer's, or Isomer's over Kibana's with an opacity slider, at the panel's size and with Kibana's fonts. It lists every difference with its feature, Kibana's value, Isomer's, the resolved model's for readings and the colors it resolves (tile background and border, sparkline fill, progress track and fill, title, subtitle, value and secondary text, badge background and text), and any gap that covers it. The model column tells lowering from rendering: when the model already holds Isomer's value, the bound node was wrong; when it holds Kibana's, the drawing was. It handles events as a dashboard does, so a tile with an action draws its title clickable. Switch the Studio to the case's color scheme to compare it.

## Adding a panel type

A new kind of panel adds a fingerprint kind in `comparison/fingerprint/` with its extractor and feature classes, the panel type to the capture's supported set, and its replay. A chart Elastic Charts draws on a canvas has no DOM to read; its extractor reads Elastic Charts' `debugState`, which Kibana enables with `window._echDebugStateFlag`.
