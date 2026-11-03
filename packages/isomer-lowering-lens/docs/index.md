---
navigation_title: Lens lowering
description: Plan native ES|QL Lens saved objects and project their responses, with no transport or chart.
---

# Lens lowering

`@elastic/isomer-lowering-lens` turns one native ES|QL or form-based Lens saved object into a versioned, plain-JSON plan a host can execute, projects the responses onto each planned layer's Lens columns, and binds the projected tables to an Isomer chart node. It draws nothing, and it writes no query: a form-based plan states Lens's own column graph for the host to run.

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';
import { bind } from '@elastic/isomer-lowering-lens/charts';

const planned = plan({ savedObject, dataViews });
if (planned.status === 'planned') {
  const tables = planned.plan.layers.map((layer) =>
    readResponse(layer, responses[layer.layerId])
  );
  // After checking every read is `ready`:
  const bound = bind(
    planned.plan,
    tables.map(({ table }) => table)
  );
}
```

| Entry | What it holds |
| --- | --- |
| `@elastic/isomer-lowering-lens` | `plan`, `readResponse` and `readTable`, with the plan, layer and table types. `zod` is its only peer; it depends on `@elastic/esql`, the parser Kibana uses, to find each ES\|QL query's parameters. |
| `@elastic/isomer-lowering-lens/charts` | `bind`, which reads chart schemas from `@elastic/isomer-primitives-charts/model`. |

Neither entry imports React, the DOM, a Node built-in, the SDK, the runtime, Studio or a chart engine, so a browser, a server or a native app can load them, and planning never loads binding. A bundler must resolve the `browser` or `node` export condition, which the parser's `antlr4` requires. Hosts own retrieving saved objects and metadata, authorization, credentials and running queries.

## Planning

`plan({ savedObject, dataViews? })` takes a Lens saved object (`id`, `type: 'lens'`, `attributes`, `references`) and, optionally, metadata for the data views it references (`id`, `title`, and optional `timeFieldName`, `fieldFormats`, `fieldLabels`). Metadata is never fetched or guessed; a data view without it is listed without it.

A saved object has one datasource: `textBased`, native ES|QL, or `formBased`. Lens's runtime `indexPatternRefs`, which Kibana sometimes saves, and the empty `layers: {}` states it keeps for other datasources the editor touched are ignored.

- **ES|QL.** Each layer needs `query: { esql }` and `columns`, each with a unique `columnId` and the response `fieldName` it reads; several columns may read one field. Labels, `meta`, `params` and any other column state are kept as they are.
- **Form-based.** Each layer needs its `indexpattern-datasource-layer-<layerId>` data view reference, and a `columnOrder` that lists each of its `columns` once. Every column's operation must be one Lens defines, its references must name columns in the layer with no cycle, and a formula's math column must keep the `tinymathAst` Lens saved, using only Lens formula functions with their arity. Formulas are never reparsed from their text. Each column is kept verbatim, in Lens order.

A planned result is `{ status: 'planned', plan }`, where `plan` has:

| Field | What it holds |
| --- | --- |
| `version` | `1`. |
| `source` | The saved object, as validated. |
| `dataViews` | Each `index-pattern` reference, with its metadata when supplied. |
| `query` | A form-based plan's saved KQL or Lucene query, verbatim. An ES\|QL plan has none. |
| `filters` | The saved Kibana filters, verbatim: `meta` beside the query, not Query DSL. |
| `layers` | Per ES\|QL layer: `kind: 'esql'`, `layerId`, `query: { language: 'esql', esql }` with the exact query text, the Lens `columns` in Lens order, and `host`. Per form-based layer: `kind: 'form'`, `layerId`, the `dataView` ID, `linkedTo` (the layers Lens's editor ties it to, such as a metric trendline's main layer), the saved `columns` with their `columnId`, and `host`. |

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
| `lens.form.missing-data-view`, `lens.form.unknown-linked-layer`, `lens.form.column-order`, `lens.form.invalid-layer` | `invalid` | A form-based layer lacks its data view reference, links to a layer the datasource lacks, has a `columnOrder` that does not match `columns`, or is malformed. |
| `lens.form.invalid-column`, `lens.form.missing-reference`, `lens.form.reference-cycle` | `invalid` | A form-based column is malformed, a reference operation lacks its one input, or a reference is missing or circular. |
| `lens.form.broken-formula`, `lens.form.formula-without-math`, `lens.form.invalid-math` | `invalid` | A formula is broken or lacks a valid saved AST. |
| `lens.unsupported-datasource` | `unsupported` | A mixed or other datasource. |
| `lens.unsupported-datasource-state`, `lens.unsupported-layer-state`, `lens.form.unsupported-state` | `unsupported` | Datasource or layer state planning does not know. |
| `lens.form.unsupported-operation`, `lens.form.incomplete-column` | `unsupported` | A form-based operation Lens does not define, or an incomplete column. |
| `lens.unsupported-inline-table` | `unsupported` | The layer saved an inline table, which Lens draws instead of running the query. |
| `lens.unsupported-drop-partials` | `unsupported` | A column drops partial buckets. |
| `lens.unsupported-anonymous-param`, `lens.unsupported-positional-param`, `lens.unsupported-param-name` | `unsupported` | A `?` or `?1` parameter, which Kibana cannot bind by name, or a name over 4096 characters. |
| `lens.unsupported-global-query` | `unsupported` | An ES\|QL global query other than empty KQL/Lucene or a copy of one layer's ES\|QL. |

Kibana saves native ES|QL Lens with a layer's ES|QL repeated as the global `state.query`; with several layers it mirrors the first. The copy is accepted when its text is exactly one layer's.

## What a host runs

Each layer's `host` says what the host must supply. Nothing in it is defaulted.

For an ES|QL layer:

| Field | Meaning |
| --- | --- |
| `timeField` | The field the host's time range filters, or `null` when the layer names none. |
| `params` | The named parameters the query references (`?_tstart`, `??field`), which the host must bind by name. |
| `applyFilters` | Whether the plan's `filters` and the host's own global filters apply to this layer. |

Run the query text as it is; don't append to or rewrite the ES|QL. Bind `params` through the request's `params`, and send the time range and filters as the request's Query DSL `filter`. A layer with `applyFilters: false` gets neither the saved nor the host's filters.

`filters` holds Kibana `Filter` objects, which a host converts to Query DSL as Kibana does before sending them: skip a filter whose `meta.disabled` is true, put one whose `meta.negate` is true under `must_not`, resolve `meta.index` or `meta.indexRefName` against the saved object's references, and send only the query part, never `meta` or `$state`. The plan does not convert them. Parameters are found as Kibana finds them, with `@elastic/esql`'s `Parser` and `Walker.params`.

For a form-based layer, the host runs Lens's columns as Lens does, with the plan's `query` and `filters`:

| Field | Meaning |
| --- | --- |
| `timeField` | The data view's time field from the supplied metadata, or `null`. |
| `applyFilters` | Whether the plan's `query`, `filters` and the host's own global filters apply. |
| `sampling` | Lens's random-sampling probability, 1 for none. |
| `needs` | What the host must supply: `dataView` when its metadata was not given, `timeRange` for a time-based data view, a time shift, reduced time range, time scale or `time_range`, `now` for `now`, and `barTarget` for an `auto` date histogram or `interval`. |

## Reading a response

`readResponse(layer, response)` takes one planned layer, revalidated so a stored plan can be read back, and a complete ES|QL response `{ columns: [{ name, type }], values }` as Elasticsearch returns it. It returns `{ status: 'ready', table: { layerId, columns, rows, partial } }`: each column carries its Lens column and the response `type`, each row follows Lens order, and `partial` says whether Elasticsearch marked the response `is_partial`, as when a remote cluster was skipped. Kibana draws such a response with a warning.

Columns match by response field name, never by position or label, and extra response columns are ignored. Cells are kept as they are: nulls, multivalue arrays and types are not coerced or formatted. A missing or repeated response column, a row of the wrong width, `is_running`, or a table of more than 200,000 cells (rows times Lens columns, since several columns can read one field) is `invalid`, with no table.

A form-based layer reads back through `readTable(layer, datatable)`, which takes the Kibana `Datatable` Lens's expression produces (`{ type: 'datatable', columns: [{ id, name, meta }], rows: [{ [id]: value }] }`) and returns the same `table`, with `partial: false`. Columns match by Lens column ID. Every column no other column references must be present; a formula's parts may be. Each column keeps the table's `name` as its label and its `meta`, and takes the planned column's Lens format. A missing or repeated column, or a table of more than 200,000 cells (rows times the planned columns present), is `invalid`.

## Binding a chart

`bind(plan, tables, { filterAction?, dates? })` takes a plan and one `readResponse` or `readTable` table per layer the chart reads, and returns `{ status: 'bound', node }` or `{ status: 'invalid' | 'unsupported', diagnostics }`. It reproduces what Lens draws from the same saved state and data, so a bound node is complete or refused, never approximated. A node is checked against its chart's schema before it is returned. `filterAction` names the action a breakdown tile raises, with the filter Lens builds for its bucket. `dates` is the host's `dateFormat` and `dateFormat:tz` (`{ format, timeZone }`), which date readings need; nothing defaults it.

The metric is the first chart bound. [Metric](metric.md) lists what it supports and refuses.

## Limits

All three functions copy their arguments before reading them, so results share nothing with the caller. Each argument must be acyclic plain JSON: no accessors, symbols, holes, custom prototypes, or non-JSON values such as `NaN`. As in `JSON.stringify`, an object property set to `undefined` is treated as absent. Across a whole argument, `JSON_LIMITS` allows 32 levels of nesting, 200,000 values and 4,000,000 characters of strings and object keys. Identifiers and parameter names are capped at 4096 characters, queries at 100,000, and references, data views and columns at 512. Nothing is truncated: over a limit, the result is `invalid`.

## Lens inspector

`pnpm studio:dev` includes a **Lens inspector** app (`#/app/lens/`) in the repository's Studio. It plans the input you paste, shows each layer's query (a form-based layer shows the plan's saved query) and plan, and projects a pasted ES|QL response or Lens `Datatable` into a table, showing at most 50 rows and 200 characters per cell. It is Studio code, not part of the package. It fetches and executes nothing, and draws no chart.
