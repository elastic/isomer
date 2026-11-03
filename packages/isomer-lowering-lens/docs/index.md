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

The package has one entry and `zod` as its only peer. It imports no React, DOM, Node built-in, SDK, runtime or Studio, so a browser, a server or a native app can load it. Hosts own retrieving saved objects and metadata, authorization, credentials and running queries.

## Planning

`plan({ savedObject, dataViews? })` takes a Lens saved object (`id`, `type: 'lens'`, `attributes`, `references`) and, optionally, metadata for the data views it references (`id`, `title`, and optional `timeFieldName`, `fieldFormats`, `fieldLabels`). Metadata is never fetched or guessed; a data view without it is listed without it.

The only datasource planned is `textBased`, native ES|QL. Each layer needs `query: { esql }` and `columns`, each with a unique `columnId` and the response `fieldName` it reads; several columns may read one field. Labels, `meta`, `params` and any other column state are kept as they are.

A planned result is `{ status: 'planned', plan }`, where `plan` has:

| Field | What it holds |
| --- | --- |
| `version` | `1`. |
| `source` | The saved object, as validated. |
| `dataViews` | Each `index-pattern` reference, with its metadata when supplied. |
| `filters` | The saved Kibana filters, verbatim: `meta` beside the query, not Query DSL. |
| `layers` | Per layer: `kind: 'esql'`, `layerId`, `query: { language: 'esql', esql }` with the exact query text, the Lens `columns` in Lens order, and `host`. |

Anything else is `{ status: 'invalid' | 'unsupported', diagnostics }`, never a partial plan. Each diagnostic has a stable `code`, a `message`, and a `path` into the input with numeric array indexes.

| Refused as | When |
| --- | --- |
| `unsupported` | A form-based or mixed datasource, unknown datasource or layer state such as an inline table, `dropPartials`, an anonymous `?` parameter, or a global query other than empty KQL/Lucene or a copy of one layer's ES\|QL. |
| `invalid` | Malformed or non-JSON input, no layers, a layer without a query, a duplicate column ID, a duplicate reference name, metadata for a data view that is repeated or not referenced, or a layer whose plan would exceed the `JSON_LIMITS` `readResponse` applies to it (its columns plus one value per parameter name). |

Kibana saves native ES|QL Lens with a layer's ES|QL repeated as the global `state.query`; with several layers it mirrors the first. The copy is accepted when its text is exactly one layer's.

## What a host runs

Each layer's `host` says what the host must supply. Nothing in it is defaulted.

| Field | Meaning |
| --- | --- |
| `timeField` | The field the host's time range filters, or `null` when the layer names none. |
| `params` | The named and numbered parameters the query references (`?_tstart`, `??field`, `?1`), which the host must bind. |
| `applyFilters` | Whether the plan's `filters` and the host's own global filters apply to this layer. |

Run the query text as it is; don't append to or rewrite the ES|QL. Bind `params` through the request's `params`, and send the time range and filters as the request's Query DSL `filter`. A layer with `applyFilters: false` gets neither the saved nor the host's filters.

`filters` holds Kibana `Filter` objects, which a host converts to Query DSL as Kibana does before sending them: skip a filter whose `meta.disabled` is true, put one whose `meta.negate` is true under `must_not`, resolve `meta.index` or `meta.indexRefName` against the saved object's references, and send only the query part, never `meta` or `$state`. The plan does not convert them. Parameters are found by a lexical scan that skips strings, quoted identifiers and comments; the query is not parsed or validated.

## Reading a response

`readResponse(layer, response)` takes one planned layer, revalidated so a stored plan can be read back, and a complete ES|QL response `{ columns: [{ name, type }], values }` as Elasticsearch returns it. It returns `{ status: 'ready', table: { layerId, columns, rows } }`: each column carries its Lens column and the response `type`, and each row follows Lens order.

Columns match by response field name, never by position or label, and extra response columns are ignored. Cells are kept as they are: nulls, multivalue arrays and types are not coerced or formatted. A missing or repeated response column, a row of the wrong width, `is_partial` / `is_running`, or a table of more than 200,000 cells (rows times Lens columns, since several columns can read one field) is `invalid`, with no table.

## Limits

Both functions copy their arguments before reading them, so results share nothing with the caller. Each argument must be finite, acyclic plain JSON: no accessors, symbols, holes, custom prototypes or non-JSON values. As in `JSON.stringify`, an object property set to `undefined` is treated as absent. Across a whole argument, `JSON_LIMITS` allows 32 levels of nesting, 200,000 values and 4,000,000 characters of strings and object keys. Identifiers and parameter names are capped at 4096 characters, queries at 100,000, and references, data views and columns at 512. Nothing is truncated: over a limit, the result is `invalid`.

## Lens inspector

`pnpm studio:dev` includes a **Lens inspector** app (`#/app/lens/`) in the repository's Studio. It plans the input you paste, shows each layer's query and `host` section, and projects a pasted response into a table, showing at most 50 rows and 200 characters per cell. It is Studio code, not part of the package. It fetches and executes nothing, and draws no chart.
