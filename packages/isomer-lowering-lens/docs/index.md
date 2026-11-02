---
navigation_title: Lens lowering
description: Portable native ES|QL planning, response projection and local browser inspection.
---

# Native ES|QL Lens core

`@elastic/isomer-lowering-lens` turns one persisted Lens envelope into a
serializable version-1 query plan. It does not choose chart primitives or claim
that a visualization is supported. Visualization state stays opaque JSON.
Ordinary form-based Lens aggregations, formulas and metric planning are not
implemented. Add each chart's semantic planning and binding in its own later
slice rather than synthesizing approximate ES|QL here.

## Named entrypoints

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';
import { LensInspector } from '@elastic/isomer-lowering-lens/inspector';
```

The root has no React, Studio, SDK, runtime, browser engine or transport
dependency. It requires the `zod` peer. The `/inspector` entry needs the optional
React peer and is a browser UI. Neither entry imports `@kbn/*`.
No wildcard exports exist. `/charts` is reserved for later chart binders, not
exported as an empty or misleading placeholder.

## Planning contract

`plan(input: unknown)` accepts `{ savedObject, dataViews? }`. The saved object
has `id`, `type: 'lens'`, `attributes` and `references`. Attributes include
`title`, `visualizationType` and `state` with `datasourceStates` and
`visualization`. Additional JSON envelope/presentation state is preserved.

The only supported datasource is `textBased`, with 1–16 native ES|QL layers.
Each layer has `query: { esql }`, `columns` and optionally `timeField`, `index`
and `ignoreGlobalFilters`. Each column has a unique `columnId` and a
`fieldName`; optional `label`, `customLabel`, `meta`, `params` and additional
JSON column metadata remain intact. Several Lens IDs may reference one field.

Success is `{ status: 'planned', plan, diagnostics: [] }`. The plan contains:

- `version: 1` and a validated copy of the source envelope.
- Every layer's exact ES|QL bytes, in `query: { language: 'esql', esql }`.
- Its Lens column mappings and explicit context: `ignoreGlobalFilters`
  defaults to `false`; `timeFieldName` exists only for an explicit `timeField`.
- Exact `index-pattern` references with optional supplied metadata.

Optional metadata is an array keyed by referenced data-view `id`, with `title`,
optional `timeFieldName`, `fieldFormats` and `fieldLabels`. Unresolved metadata
remains absent, not guessed; metadata does not supply an execution time-field
fallback. Duplicate reference names, metadata IDs and unrelated metadata are
invalid. A source-free query requires no data view.

Malformed input returns `{ status: 'invalid', diagnostics }`. Unsupported
semantics return `{ status: 'unsupported', diagnostics }`. Each diagnostic has
`code`, `message` and an input `path`. Neither outcome exposes a partial plan.
Unsupported cases include form-based/mixed/legacy datasources, inline tables,
unknown datasource/layer extensions, partial-bucket transforms, saved filters and
global queries requiring additional execution semantics. Empty `kuery`/`lucene`
saved queries are accepted. Native Lens's global `state.query: { esql }` is
accepted only when it contains no other keys and matches every layer query
byte-for-byte. The global copy is preserved, not executed again or used to
overwrite differing layers. Mismatches (including whitespace differences) and
mixed/extended query objects return `lens.unsupported-saved-context`.
This covers dual-written saved objects as well as newer layer-only envelopes.
Layer queries remain authoritative; a stale global copy is refused rather than
guessed. Kibana's [query-state fixtures](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-lens-common/esql/lens_attributes_queries.test.ts)
distinguish layer-only documents from legacy dual-written ones.
Whitespace-only ES|QL is invalid. No ES|QL parsing, rewriting or injection occurs.

Hosts retrieve saved objects and metadata, authorize access and execute all
queries with Lens-compatible execution-time context. A planned result is not
permission to execute, nor proof of backend validity or visualization support.

## Response reading

`readResponse(query, response)` accepts a planned query (also runtime-validated)
and complete ES|QL `{ columns: [{ name, type }], values }`. Success is
`{ status: 'ready', table: { layerId, columns, rows } }`. Table columns contain
the original `lens` column metadata and the `responseType`; rows follow Lens
column order, resolving by response field name, not label or position. Extra
response fields are allowed. Duplicate response names are ambiguous and invalid.

Nulls, multivalued cells, response types and formatting metadata remain
uncoerced. Empty results stay empty. Missing fields, ragged rows, partial or
running responses return `invalid` diagnostics without a table. The reader
does not format values, adjust date histograms or bind charts. Returned data is
detached from caller-owned objects.

## Input limits

Both APIs refuse nonfinite or non-JSON values, accessors, symbols, sparse or
extended arrays, custom prototypes, cycles and prototype-related keys. Limits
apply to each complete input argument: 20 levels of nesting, 100,000 traversed
values, 2,000,000 aggregate string/key characters, 100,000 characters per string,
4096 per key and 10,000 entries per array/object. Schemas further cap identifiers
at 4096 characters, layers at 16, references/data views/columns at 512, and
response rows at 10,000. These caps intersect: a wide response may hit the
aggregate value limit before the row limit. Nothing is silently truncated.

## Browser inspector

Run `pnpm studio:dev`, then open **Lens inspector** (`#/app/lens/`). The shared
browser-only config retains slides and Decks alongside it. The synthetic
example is explicitly local response replay, not an executed backend query.
The inspector is lazy-loaded through Studio's existing app boundary; it does
not add a route or capability to the lowering core.

The reusable `LensInspector` accepts optional `initialInput` and
`initialResponse` JSON strings. Paste `{ savedObject, dataViews? }`, select
**Inspect envelope**, choose a planned layer, paste its ES|QL response and select
**Inspect response**. All plan/source/context and response projection metadata
are inspectable as JSON within a 100,000-character display budget per result.
Serialization stops before expanded output can exceed that budget, including
duplicate field projections and repeated metadata references. Oversized results
produce a visible diagnostic rather than truncated JSON or a render failure;
editable inputs and planned layer selection remain available for recovery.
The portable planning/response results themselves are not truncated.
Syntax errors and invalid/unsupported diagnostics
remain visible. Editing inputs or switching layers clears stale results.
Text input is capped at 2,000,000 characters before parsing, separately from
the core's structural limits.

No retrieval, network request, persistence, execution button, credentials,
chart primitive, renderer, metric binder or image backend is included.
Response replay is source/browser evidence only; it is not backend execution
parity. Hosts must establish that separately.
