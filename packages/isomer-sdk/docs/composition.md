# Composition and validation

A `Composition` is the resolved JSON document that travels: a title, an optional subtitle and theme, an optional `version`, and a body of at least one node. The SDK owns its schema, and everything downstream, the validator, the parser, and the JSON Schema an agent reads, is built from the same composition.

```ts
{ type: 'view', version?: 1, title?, subtitle?, theme?, body: [PrimitiveNode, ...], meta? }
```

The discriminator is `'view'` and does not change. `version` is an optional literal `1`; absent means v1. The schema uses `z.literal(1).optional()` with no default, so parse does not rewrite stored documents. The object is `.strict()`, so an unrecognized top-level key is an error rather than silently ignored, and `definePrimitive` closes every node schema the same way, so the validator agrees with the `additionalProperties: false` the JSON Schema projection emits. `body` must hold at least one node.

## Validate versus parse

Two functions, deliberately different in scope.

```ts
const validate = createCompositionValidator(definitions, { sizesFromNodeHeights });
const parse = createCompositionParser(definitions);
```

`createCompositionValidator` is the **trusted-input** path: schema first, then the semantic passes. It returns `{ valid, errors, warnings }`, where `valid` turns on duplicate-id errors and the warnings are advisory (empty when there are none).

`createCompositionParser` is the **untrusted-input** path: schema only, reported rather than thrown, returning `{ valid, errors, composition? }`. It answers "is this a `Composition`", not "is this a good one": it does not run the duplicate-id pass and produces no warnings, so a composition with two nodes sharing an `id` parses as valid. A caller that wants the semantic checks runs `validate` on the parsed composition.

## The semantic passes

| Pass                | Produces | Fires when                                                                                               |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Duplicate node ids  | errors   | two nodes share an `id`                                                                                  |
| Empty surfaces      | warnings | a node renders nothing on a surface it claims                                                            |
| Missing `svgHeight` | warnings | a node renders to `svg` but declares no `metrics.svgHeight`, **only** when `sizesFromNodeHeights` is set |

That last gate is a runtime fact, not a per-node one: any frame that sums node heights makes the metric load-bearing, and a runtime whose frames are all fixed-size would otherwise collect warnings for a value nothing reads. A warning per node per slide is how a warning channel gets ignored.

Every warning names the surface it applies to, so a caller narrows before showing:

```ts
import { warningsForSurface } from '@elastic/isomer-sdk';
warningsForSurface(result, 'svg');
```

## Error messages

Every error is a `ValidationError`, `{ path, message }`: `path` locates the value (`body[3].items[0].label`, empty for the document as a whole) and `message` is a predicate, so `formatValidationError` joins them into one sentence for a log or a model. `formatZodIssue` does the conversion from a Zod issue, with three cases worded centrally so per-schema messages carry no boilerplate: a missing required field is `is required`, an enum or discriminator mismatch is `must be one of: a, b, c`, unknown keys are `has unrecognized key(s): …`, and Zod's default size wording becomes `must not be empty` or `must be at least 3 characters`. A schema's own message is never rewritten, so the `requiredString` / `enumOf` helpers and a `.min(1, { error })` of your own read the same way.

`enforceValidationMode(result, mode)` is the shared throw-or-collect switch: it raises `CompositionValidationError` only when the caller passed `'throw'`.

## JSON Schema

`buildCompositionJsonSchema(definitions, options)` projects the composition to draft-2020-12 for hosts that validate outside TypeScript. Two options carry weight: `reused: 'ref'` emits one named `$def` per primitive instead of inlining the union at every container, and `unrepresentable: 'any'` drops what JSON Schema cannot express, which is why anything stated only in a Zod refinement must also be stated in prose an agent will read.

`buildAuthoringJsonSchema` is the projection an agent reads. It starts from the validator schema, names the SDK's shared value schemas (`tone`, `displayValue`, `structuredValue`, `renderTheme`), inlines bare scalar `$defs` and `$ref`-only hops, drops `Number.MAX_SAFE_INTEGER` bounds and per-node `id`/`surfaces`, and accepts `describe` / `omitProperties` / extra pack `$defs` (`actionItem`, `badgeItem`) from the caller. The validator projection is unchanged: a node that emits `id` still parses.

## How the body-node union is built

For anyone touching this layer rather than calling it. `resolveVocabulary(definitions)` returns both the union and the schema instance that actually landed in it per type:

```ts
interface ResolvedVocabulary {
  bodyNodeSchema: ZodType<unknown>;
  members: ReadonlyMap<string, ZodObject>;
}
```

**Containers reference _this_ union.** The recursion is closed by a `z.lazy` created here and discarded with the composition. `z.lazy` memoizes its getter after the first resolution, so an instance shared across compositions would freeze on whichever union parsed first; scoping the getter cannot fix that, only scoping the instance can.

**The members are not `definition.schema`.** A container's member is built by `schemaFor`, so it is a different object. Anything keyed on identity, in practice the JSON Schema id registry that names `$defs`, has to be handed these, or a container's projection silently loses its name.

Building a discriminated union over a large pack is not cheap, and a runtime needs the same schema three times over: validator, parser, authoring context. `getCompositionSchemaForDefinitions` memoizes on the **identity of the definitions array**, and caches the composition alongside the schema so the two cannot disagree. Hold one array and reuse it; rebuilding it per call silently rebuilds everything.

## Next

[Primitives](primitives.md) for `schema` versus `schemaFor` · [Dispatch](dispatch.md) · [URL trust](url-trust.md) for the refinements on URL-bearing fields
