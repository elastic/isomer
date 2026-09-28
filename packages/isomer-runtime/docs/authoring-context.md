# Authoring context

The authoring context is what a host hands an agent so it can answer a question with a composition: the composition contract, what it may compose from, and what it can request by id. It is the untrusted path's other half — the agent writes JSON, and `runtime.parse` decides whether that JSON is a composition this runtime can render.

```ts
const { schema, primitives, views } = runtime.getAuthoringContext();
```

| Field | What it is | Freshness |
| --- | --- | --- |
| `schema` | Authoring JSON Schema for a `Composition` built from this runtime's primitives | cached |
| `primitives` | One catalog entry per primitive: purpose, `useWhen`, `avoidWhen`, `example` | cached |
| `groups` | Every pack's `groups`, in pack order, for an index of the catalog | cached |
| `views` | Registered-view summaries, each with its input JSON Schema, read from this runtime's own `viewRegistry` — the `views` option to `createIsomerRuntime` or `runtime.viewRegistry.register`, never a separately constructed registry | live |
| `schemaFor(types)` | Authoring JSON Schema restricted to `types`, e.g. a registered view's narrower input | uncached |
| `describePrimitives(types)` | The catalog entries of `types` and the `$defs` they reach in `schema`, for an agent that reads an index first | cut from `schema` |

Both halves arrive from one call on purpose. An agent choosing between routing to a registered view and composing from primitives needs to see both options at once, and a host should not have to stitch that catalog together from two sources.

The caching split is equally deliberate. The schema and catalog cannot change for the runtime's lifetime, and projecting a discriminated union is expensive, so they are computed once via the SDK's `buildAuthoringJsonSchema`. The view list is read on every call, because a host may register views after boot and an agent asking now should see what is registered now; each view's summary is projected once at registration, so the read is cheap. `schemaFor` is not cached: it exists for a handful of subsets, not one call per render.

Pass `authoring` on `createIsomerRuntime` to name pack-owned `$defs` (`actionItem`, `badgeItem`), attach refine descriptions, or hide a legacy alias. The validator schema `parse` uses is unchanged. A pack can contribute its own `describe`/`omitProperties` too, via `authoring` on its `PrimitivePackInput` — see [Packs](../../isomer-sdk/docs/packs.md#authoring) — and the runtime merges every composed pack's contribution with this option, which wins on conflict.

## An index, then lookups

The whole catalog and schema is too much for an agent to read at once. A host can instead send an index — `buildAuthoringPrompt` with `catalog: 'index'`, `groups`, and no `schema` lists each primitive's type and purpose under its group — and answer lookups with `describePrimitives(types)`, which takes at most 100 types and refuses more with `TOO_MANY_TYPES` before reading any. Its `$defs` keep the ids they have in `schema`, so two lookups agree, and `bodyNode` is a stub meaning any primitive rather than the whole union. `schemaFor` differs on both counts: it rebuilds a schema whose body node is only `types`, which suits a registered view's input. Validation errors name the primitive their path lands in (`body[0].items (in slideTimeline) is required`), so an agent knows what to look up. A misspelled type is answered with the closest one (`is "slideBarz"; did you mean "slideBars"?`), and an unknown key on a node with the fields it takes.

## Taking the answer back

```ts
const parsed = runtime.parse(JSON.parse(modelOutput));
if (!parsed.valid) {
  return retryWith(parsed.errors);
}
render(parsed.composition!);
```

`parse` answers one question — is this a `Composition` for this runtime? — and stops there. It runs the schema but not the semantic passes, so a composition with two nodes sharing an `id` parses as valid. If you want those checks, run `validate` on the parsed composition:

```ts
import { warningsForSurface } from '@elastic/isomer-sdk';

const result = runtime.validate(parsed.composition!);
result.errors; // duplicate ids
result.warnings; // per-surface findings — narrow with warningsForSurface
```

Errors from either are path-prefixed and single-purpose, which is the shape a model can retry from.

## What hosts add

The runtime supplies the structural half. Most hosts send more, because a vocabulary has copy the runtime does not own: a pack's authoring guide and rules, golden composition fixtures, and `runtime.getCapabilities()` so an agent stops proposing primitives the host would only degrade.

## Capabilities

```ts
runtime.getCapabilities();
// { primitives: […], formats: ['react','html','text','markdown','slack','svg'],
//   enhancements: { tableSort: true, clipboard: true } }  // request them with `enhancements: ['tableSort']`
```

`formats` reports the surfaces that were actually built — a runtime with no [frame](frame.md) truthfully omits `svg`.

## Next

[View registry](view-registry.md) for the trusted path · [Surfaces](surfaces.md) for rendering what comes back
