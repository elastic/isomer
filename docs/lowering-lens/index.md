---
navigation_title: Lens lowering
description: Plan native ES|QL Lens saved objects and project their responses, with no transport or chart.
---

# Lens lowering

`@elastic/isomer-lowering-lens` turns one native ES|QL Lens saved object into a versioned, plain-JSON plan a host can execute, and projects a recorded ES|QL response onto a planned layer's Lens columns. It draws nothing and chooses no primitive: chart binding arrives with each chart, and form-based Lens is refused rather than approximated.

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';

const planned = plan({ savedObject, dataViews });
if (planned.status === 'planned') {
  const [layer] = planned.plan.layers;
  const read = readResponse(layer, esqlResponse);
}
```

The package has one entry and `zod` as its only peer. It depends on `@elastic/esql`, the parser Kibana uses, to find each query's parameters, and imports no React, DOM, Node built-in, SDK, runtime or Studio, so a browser, a server or a native app can load it. A bundler must resolve the `browser` or `node` export condition, which the parser's `antlr4` requires. Hosts own retrieving saved objects and metadata, authorization, credentials and running queries.

## Planning

`plan({ savedObject, dataViews? })` takes a Lens saved object (`id`, `type: 'lens'`, `attributes`, `references`) and, optionally, metadata for the data views it references (`id`, `title`, and optional `timeFieldName`, `fieldFormats`, `fieldLabels`). Metadata is never fetched or guessed; a data view without it is listed without it.

The only datasource planned is `textBased`, native ES|QL. Each layer needs `query: { esql }` and `columns`, each with a unique `columnId` and the response `fieldName` it reads; several columns may read one field. Labels, `meta`, `params` and any other column state are kept as they are. Lens's runtime `indexPatternRefs`, which Kibana sometimes saves, and the empty `layers: {}` states it keeps for other datasources the editor touched are ignored.

A planned result is `{ status: 'planned', plan }`, where `plan` has:

| Field | What it holds |
| --- | --- |
| `version` | `1`. |
| `source` | The saved object, as validated. |
| `dataViews` | Each `index-pattern` reference, with its metadata when supplied. |
| `filters` | The saved Kibana filters, verbatim: `meta` beside the query, not Query DSL. |
| `layers` | Per layer: `kind: 'esql'`, `layerId`, `query: { language: 'esql', esql }` with the exact query text, the Lens `columns` in Lens order, and `host`. |

Anything else is `{ status: 'invalid' | 'unsupported', diagnostics }`, never a partial plan. `invalid` means the input is malformed or Kibana could not draw it either; `unsupported` means Kibana draws it but this package does not plan it yet. Each diagnostic has a stable `code`, a `message`, and a `path` into the input with numeric array indexes.

| Code | Status | When |
| --- | --- | --- |
| `lens.invalid-json` | `invalid` | An argument is cyclic, over `JSON_LIMITS`, or not plain data. |
| `lens.invalid-input`, `lens.invalid-esql-layer` | `invalid` | The saved object or a layer does not match its schema, non-JSON values such as `NaN` included. |
| `lens.duplicate-reference`, `lens.duplicate-data-view`, `lens.unreferenced-data-view` | `invalid` | A reference name repeats, or data view metadata repeats or describes an unreferenced data view. |
| `lens.no-layers`, `lens.missing-esql-query`, `lens.duplicate-column` | `invalid` | The datasource has no layers, a layer has no query, or a column ID repeats. |
| `lens.layer-errors` | `invalid` | Lens saved editor errors with the layer, which it shows instead of a chart. |
| `lens.invalid-esql-query` | `invalid` | The query does not parse. |
| `lens.layer-too-large` | `invalid` | The planned layer would exceed the `JSON_LIMITS` `readResponse` applies to it. |
| `lens.unsupported-datasource` | `unsupported` | A form-based or mixed datasource. |
| `lens.unsupported-datasource-state`, `lens.unsupported-layer-state` | `unsupported` | Datasource or layer state planning does not know. |
| `lens.unsupported-inline-table` | `unsupported` | The layer saved an inline table, which Lens draws instead of running the query. |
| `lens.unsupported-drop-partials` | `unsupported` | A column drops partial buckets. |
| `lens.unsupported-anonymous-param`, `lens.unsupported-positional-param`, `lens.unsupported-param-name` | `unsupported` | A `?` or `?1` parameter, which Kibana cannot bind by name, or a name over 4096 characters. |
| `lens.unsupported-global-query` | `unsupported` | A global query other than empty KQL/Lucene or a copy of one layer's ES\|QL. |

Kibana saves native ES|QL Lens with a layer's ES|QL repeated as the global `state.query`; with several layers it mirrors the first. The copy is accepted when its text is exactly one layer's.

## What a host runs

Each layer's `host` says what the host must supply. Nothing in it is defaulted.

| Field | Meaning |
| --- | --- |
| `timeField` | The field the host's time range filters, or `null` when the layer names none. |
| `params` | The named parameters the query references (`?_tstart`, `??field`), which the host must bind by name. |
| `applyFilters` | Whether the plan's `filters` and the host's own global filters apply to this layer. |

Run the query text as it is; don't append to or rewrite the ES|QL. Bind `params` through the request's `params`, and send the time range and filters as the request's Query DSL `filter`. A layer with `applyFilters: false` gets neither the saved nor the host's filters.

`filters` holds Kibana `Filter` objects, which a host converts to Query DSL as Kibana does before sending them: skip a filter whose `meta.disabled` is true, put one whose `meta.negate` is true under `must_not`, resolve `meta.index` or `meta.indexRefName` against the saved object's references, and send only the query part, never `meta` or `$state`. The plan does not convert them. Parameters are found as Kibana finds them, with `@elastic/esql`'s `Parser` and `Walker.params`.

## Reading a response

`readResponse(layer, response)` takes one planned layer, revalidated so a stored plan can be read back, and a complete ES|QL response `{ columns: [{ name, type }], values }` as Elasticsearch returns it. It returns `{ status: 'ready', table: { layerId, columns, rows, partial } }`: each column carries its Lens column and the response `type`, each row follows Lens order, and `partial` says whether Elasticsearch marked the response `is_partial`, as when a remote cluster was skipped. Kibana draws such a response with a warning.

Columns match by response field name, never by position or label, and extra response columns are ignored. Cells are kept as they are: nulls, multivalue arrays and types are not coerced or formatted. A missing or repeated response column, a row of the wrong width, `is_running`, or a table of more than 200,000 cells (rows times Lens columns, since several columns can read one field) is `invalid`, with no table.

## Limits

Both functions copy their arguments before reading them, so results share nothing with the caller. Each argument must be acyclic plain JSON: no accessors, symbols, holes, custom prototypes, or non-JSON values such as `NaN`. As in `JSON.stringify`, an object property set to `undefined` is treated as absent. Across a whole argument, `JSON_LIMITS` allows 32 levels of nesting, 200,000 values and 4,000,000 characters of strings and object keys. Identifiers and parameter names are capped at 4096 characters, queries at 100,000, and references, data views and columns at 512. Nothing is truncated: over a limit, the result is `invalid`.

## Lens inspector

`pnpm studio:dev` includes a **Lens inspector** app (`#/app/lens/`) in the repository's Studio. It plans the input you paste, shows each layer's query and `host` section, and projects a pasted response into a table, showing at most 50 rows and 200 characters per cell. It is Studio code, not part of the package. It fetches and executes nothing, and draws no chart.
