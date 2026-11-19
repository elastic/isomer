---
navigation_title: Materializing
description: What a Kibana Vega materializer does on the server before Isomer sees a vega node, and what it must never leave to Isomer.
---

# Materializing a Kibana Vega panel

Isomer never reads saved objects, queries Elasticsearch, or fetches anything a spec names. A Kibana Vega panel reaches Isomer only after a materializer on Kibana's server has resolved everything Kibana's own Vega view would load, as the user it acts for. This page is that contract.

## Steps

1. **Parse the saved spec.** Kibana stores Vega as HJSON. Parse it, and take `mode` from `$schema`: `vega-lite` when it names Vega-Lite, else `vega`.
2. **Run each Elasticsearch source.** A data entry whose `url` is an object with `index` is a query. Build the `_search` body as Kibana's `EsQueryParser` does: `%context%: true` puts the dashboard's query and filters in `bool`, and is exclusive with `body.query`; `%timefield%` adds the time range on that field; `%context_query%`, `%dashboard_context-must_clause%`, `%dashboard_context-filter_clause%`, `%dashboard_context-must_not_clause%`, `%timefilter%` and `%autointerval%` resolve in place; the data view's runtime fields go in `runtime_mappings`. Run it, and put the response in a [result](#results) at the entry's path. A query the materializer cannot build exactly is an [unsupported](#what-cannot-be-materialized) panel, not an approximation.
3. **Resolve or refuse every other loader.** An EMS file source (`%type%: emsfile`) resolves through the Maps materializer's `EmsBoundaryProvider`, as [map mode](#map-mode) does. A string `url`, or an image mark's `url`, never reaches Isomer: the pack refuses it at validation. Resolve it on the server and inline it, record a loss, or emit `unsupported`.
4. **Lower map mode.** See [Map mode](#map-mode).
5. **Rewrite Kibana's expression functions.** Isomer's Vega knows none of Kibana's `kibanaAddFilter`, `kibanaRemoveFilter`, `kibanaRemoveAllFilters` or `kibanaSetTimeFilter`, and a spec that calls one fails validation. Turn a time-filter brush into a signal holding `[from, to]` named by [`interactions.brush`](index.md#interactions); turn a click filter into `interactions.select: ['mark']` where the spec reads a flat `data` table; remove what neither covers, and record each as a `dropped` loss.
6. **Describe the node.** Set `title` from the panel, `description` to one sentence saying what the chart shows, `source` (`host: 'kibana'`, the version, `capturedAt`, the absolute `timeRange`, and in `meta` the saved object and panel the node came from), `losses`, and `interactions.link` back to the dashboard ("Open in Kibana").
7. **Size it.** Leave `width` and `height` unset in a grid, whose panel sizes the chart; set them for a lone chart.
8. **Stay in budget.** Prune results with `pruneVegaResults`. A node still over the [limits](index.md#rules) is `unsupported`.

`kibanaPanelExample` and `mapExample` show nodes as a materializer hands them over.

## Results

`results` keep the spec as authored, queries included, as Dashboards as Code keeps a Vega panel's: each `{ path, values, scope: 'static' }` replaces the `url` of the data entry at `path` with `values`, the response as Elasticsearch returned it, so the spec's `format.property` and transforms read it as in Kibana. A source keeps its `url` only where a result replaces it.

A response is usually far larger than what the drawing reads. `pruneVegaResults(input, themes)` runs the drawing once with each result behind read-recording proxies, tooltips stripped, and keeps only what was read: an array keeps its length, unread items `null`. It returns the pruned input only if it draws the same SVG under every theme given, else the input unchanged. A chart with results is static: a hover would show values pruned away.

```ts
import { pruneVegaResults, VEGA_THEMES } from '@elastic/isomer-primitives-vega';

const pruned = pruneVegaResults(
  { mode, spec, width, height, results },
  [VEGA_THEMES.light, VEGA_THEMES.dark]
);
```

When a response is one flat bucket list the spec reads directly, a materializer may instead flatten it into [`data`](index.md#the-node), with typed columns and portable formats, so text surfaces show a formatted table and selections work.

## Map mode

Kibana draws a map-mode spec (`config.kibana.type: "map"`) as a Vega layer over a MapLibre basemap of EMS tiles. The pack refuses it as authored, because it cannot fetch the tiles and Vega alone does not know the projection. A materializer lowers it as Kibana's `injectMapPropsIntoSpec` does:

- read `latitude`, `longitude`, `zoom` (with `minZoom` and `maxZoom`), `mapStyle` and `emsTileServiceId` from `config.kibana`, with Kibana's defaults and clamping, and drop `config.kibana`;
- compile Vega-Lite without its generated projection, set `autosize: 'none'`, and add the `zoom`, `latitude` and `longitude` signals and Kibana's Web Mercator `projection` at MapLibre's 512-pixel tiles, where the spec does not define them;
- size the view to the panel, with no padding and a transparent background.

That projection is the Maps pack's `view` math, so a lowered map-mode chart and a `map` node over the same `{ lat, lon, zoom }` line up.

Then the land beneath it, unless `mapStyle` is `false`. EMS is fetched on Kibana's server only, through the Maps materializer's `EmsBoundaryProvider` (`createEmsBoundaryProvider(emsClient)` in `@kbn/isomer-maps`), so both packs share one way of reaching EMS, its settings, proxying and caching:

- **By default, boundaries.** Draw the provider's `world_countries` features, simplified to stay in budget, as muted land: inline GeoJSON or TopoJSON under the spec's `values`, a `shape` mark with a `geoshape` transform over the same projection, first in `marks`. Record the dropped tiles as an `approximated` loss. This is what the Maps pack does headless, and what `mapExample` shows.
- **Where a host has budget for them, tiles.** Fetch the EMS raster tiles covering the panel and stamp them on the node as `basemap.tiles`: inline PNG, JPEG or WebP `data:` URIs in the chart's pixel frame, at most 16, with the EMS attribution. The pack draws them beneath everything Vega draws, as Kibana does, and never fetches one. The pack's input budget, 10,000,000 characters, holds a few panels of tiles; the Maps pack defers tiles until it has the same budget.

A chart with a basemap is static.

A spec outside map mode that loads EMS shapes, `url: { "%type%": "emsfile", "name": … }`, resolves the same way: the provider's features for that layer become the entry's [result](#results), simplified if they would not fit, with an `approximated` loss when they are.

## What cannot be materialized

Emit the charts pack's [`unsupported`](../charts/unsupported.md) node, with a reason a reader understands and the link back to Kibana, for a panel whose spec:

- loads a URL the materializer will not resolve;
- uses a query, placeholder or function the materializer cannot reproduce exactly;
- stays over the size limits after pruning;
- fails Vega's parser, or draws nothing.

Nothing is dropped or approximated silently: a partial rendering records each difference in `losses`.
