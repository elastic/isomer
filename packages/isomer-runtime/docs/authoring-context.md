# Authoring context

The authoring context is what a host hands an agent so it can answer a question with a composition: the composition contract, what it may compose from, and what it can request by id. It is the untrusted path's other half — the agent writes JSON, and `runtime.parse` decides whether that JSON is a composition this runtime can render.

```ts
const { schema, primitives, views } = runtime.getAuthoringContext();
```

| Field | What it is | Freshness |
| --- | --- | --- |
| `schema` | Authoring JSON Schema for a `Composition` built from this runtime's primitives | cached |
| `bodySchema` | The `body` of `schema` as a schema of its own, with the `$defs` it reaches, for an editor that validates body nodes | cached |
| `declarations` | `.d.ts` source for the registered primitives; see [Editor declarations](#editor-declarations) | cached |
| `primitives` | One catalog entry per primitive: purpose, `useWhen`, `avoidWhen`, `example` | cached |
| `views` | Registered-view summaries, each with its input JSON Schema, read from this runtime's own `viewRegistry` — the `views` option to `createIsomerRuntime` or `runtime.viewRegistry.register`, never a separately constructed registry | live |
| `groups` | Every pack's primitive groups, in pack order, for an index catalog | cached |
| `schemaFor(types)` | Authoring JSON Schema restricted to `types`, e.g. a registered view's narrower input | uncached |
| `describePrimitives(types)` | The catalog entries of `types`, the `$defs` of `schema` they reach with the body-node union stubbed, and `props`: each type's properties as `PropDescriptor`s | uncached |

Both halves arrive from one call on purpose. An agent choosing between routing to a registered view and composing from primitives needs to see both options at once, and a host should not have to stitch that catalog together from two sources.

The caching split is equally deliberate. The schema and catalog cannot change for the runtime's lifetime, and projecting a discriminated union is expensive, so they are computed once via the SDK's `buildAuthoringJsonSchema`. The view list is read on every call, because a host may register views after boot and an agent asking now should see what is registered now; each view's summary is projected once at registration, so the read is cheap. `schemaFor` is not cached: it exists for a handful of subsets, not one call per render.

A runtime with many primitives can hand an agent an [index](../../isomer-sdk/docs/authoring.md#an-index-then-lookups) built from `primitives` and `groups` instead of the whole catalog and schema, then answer each lookup with `describePrimitives`. Its `$defs` keep the ids `schema` uses, so two lookups never disagree about a shared def. Both lookups throw `UNKNOWN_PRIMITIVE_TYPE` for a type this runtime does not register.

A host that documents props (a docs site, Storybook controls, a props table) reads `describePrimitives(types).props` instead of walking `$defs`, `$ref`, `anyOf`, and `enum` itself. `props[type]` lists one `PropDescriptor` per property in schema order: `name`, a display `type` (`string`, `tone`, `primary | warning`, `string[]`), a `kind` (`string`, `number`, `boolean`, `enum`, `array`, `object`, or `other`), `values` when `kind` is `enum`, `required`, and `description`. A property that refers to a named def displays the def's name and still reports the kind and `values` it resolves to; a discriminator such as `type` is a one-value `enum`; a union that is not all enum values is `other`. `values` holds string choices only: a nullable prop shows `| null` in its `type` but not in `values`, and a number or boolean choice is shown as written in `type` (`1 | 2`) with kind `number` or `boolean`.

Pass `authoring` on `createIsomerRuntime` to name pack-owned `$defs` (`actionItem`, `badgeItem`), attach refine descriptions, or hide a legacy alias. The validator schema `parse` uses is unchanged. A pack can contribute its own `describe`/`omitProperties` too, via `authoring` on its `PrimitivePackInput` — see [Packs](../../isomer-sdk/docs/packs.md#authoring) — and the runtime merges every composed pack's contribution with this option, which wins on conflict.

## Editor declarations

An editor that type-checks bodies, such as Monaco or a language server, wants TypeScript rather than JSON Schema. `declarations` prints the authoring `schema` as one ambient script, so a host loads it as a single extra lib (`monaco.languages.typescript.typescriptDefaults.addExtraLib(declarations, 'isomer.d.ts')`) and validates JSON bodies against `bodySchema`:

- `<Type>Node` per primitive (`slideStats` becomes `SlideStatsNode`), with its catalog `purpose`, `useWhen`, and `avoidWhen` as JSDoc and each prop's description as its own.
- `BodyNode`, the union of those, which every container's child slot references.
- A type per other named `$def` (`RenderTheme`, and any def a pack names through `authoring`). Anonymous defs are inlined.

The text is a script, not a module, so its names are globals; a host that loads two runtimes' declarations in one editor gets a clash. Type names that collide are numbered (`NoteNode2`).

Set `authoring: { jsx: true }` when authors write JSX through `buildJsxShim`. The declarations then add `JSX.ElementChildrenAttribute` and a minimal `JSX.Element` if no other lib supplies them, `AuthorChildren`, `CompositionProps`, and per primitive and branded child a `<Component>Props` and `declare const <Component>: (props: <Component>Props) => null`. Props follow the shim: a branded field, or a container's one child slot, is optional on the props because children fill it, and a `toItem` child takes loose props because its record is built by hand. The runtime cannot see whether a host builds a shim, which is why the option is opt-in.

## Taking the answer back

```ts
const parsed = runtime.parse(JSON.parse(modelOutput));
if (!parsed.valid) {
  return retryWith(parsed.errors);
}
render(parsed.composition!);
```

`parse` answers one question — is this a `Composition` for this runtime? — and stops there. It runs the input budget and the schema but not the semantic passes, so a composition with two nodes sharing an `id` parses as valid. If you want those checks, run `validate` on the parsed composition:

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
//   support: { kpi: { react: 'native', …, slack: 'native' }, sparkline: { react: 'native', …, slack: 'fallback' } },
//   enhancements: { tableSort: true, clipboard: true } }  // request them with `enhancements: ['tableSort']`
```

`formats` reports the surfaces that were actually built — a runtime with no [frame](frame.md) truthfully omits `svg`.

`support` says how each of those formats renders each primitive. `slack` is `native` when the primitive has its own `slack` renderer, from its definition or a renderer override, and `fallback` when the dispatcher converts its markdown to Block Kit instead; a pack's `surfaces` declaration does not change it. Every other format is `native`, since it renders from the `react`, `text`, or `markdown` renderer every primitive must have.

## Next

[View registry](view-registry.md) for the trusted path · [Surfaces](surfaces.md) for rendering what comes back
