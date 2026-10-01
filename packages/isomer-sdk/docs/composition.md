# Composition and validation

A `Composition` is the resolved JSON document that travels: a title, an optional subtitle and theme, an optional `version`, and a body of at least one node. The SDK owns its schema, and everything downstream, the validator, the parser, and the JSON Schema an agent reads, is built from the same composition.

```ts
{ type: 'view', version?: 1, title?, subtitle?, theme?, body: [PrimitiveNode, ...], meta? }
```

The discriminator is `'view'` and does not change. `version` is an optional literal `1`; absent means v1. The schema uses `z.literal(1).optional()` with no default, so parse does not rewrite stored documents. The object is `.strict()`, so an unrecognized top-level key is an error rather than silently ignored, and `definePrimitive` closes every node schema the same way, so the validator agrees with the `additionalProperties: false` the JSON Schema projection emits. `body` must hold at least one node.

## Validate versus parse

Two functions, deliberately different in scope.

```ts
const validate = createCompositionValidator(definitions, { sizesFromNodeHeights, inputBudget });
const parse = createCompositionParser(definitions, { inputBudget });
```

`createCompositionValidator` is the **trusted-input** path. It runs [the input budget](#the-input-budget) first, which refuses the input or builds a plain copy of it, then the schema on that copy, then, when the schema passes, the semantic passes on the same copy. It returns `{ valid, errors, warnings, composition }`, where `valid` turns on duplicate-id errors, the warnings are advisory (empty when there are none), and `composition` is the plain copy every check ran on, `undefined` only when [the budget](#the-input-budget) refused the input. A render draws that copy, never the value it was handed, so what it draws is what was checked.

`createCompositionParser` is the **untrusted-input** path: the input budget, then the schema only, reported rather than thrown, returning `{ valid, errors, composition? }`. It answers "is this a `Composition`", not "is this a good one": it does not run the duplicate-id pass and produces no warnings, so a composition with two nodes sharing an `id` parses as valid. A caller that wants the semantic checks runs `validate` on the parsed composition.

## The input budget

Both refuse input over its budget before the schema runs, since Zod parses nested containers recursively and a deep enough body would overflow the stack. `checkInputBudget(value, budget?)` walks the value without recursion and stops at the first limit it passes: nesting deeper than `MAX_INPUT_DEPTH` (64) objects and arrays, the input itself included; more than `MAX_INPUT_VALUES` (20,000) objects, arrays, and leaves; or more than `MAX_INPUT_CHARACTERS` (1,000,000) characters across object keys, strings, and each other leaf as `String` prints it. A value that contains itself is refused too; one repeated beside itself is not. Its cost is linear in the input's size: it lists a container's own keys, as any enumeration in JavaScript does, then refuses past the value limit before reading any of them, so a huge array or record costs one pass over its keys and no more.

It also refuses what is not plain data, because the schema reads fields by ordinary property access and would reach what the walk could not see: an array with a hole, an object whose prototype is not `Object.prototype` or `null` (a class instance, a `Map`, an object inheriting its fields), a symbol key, an accessor or non-enumerable property, or a function. A `JSON.parse` result is always plain data; an object from another realm, such as an iframe, is not, since its prototype is that realm's `Object.prototype`.

What passes comes back as `{ valid: true, value }`, where `value` is a plain copy built during the walk: plain objects keep a `null` prototype, arrays keep only their indices, and each property is read once through its descriptor. The validator and parser hand that copy to the schema and the semantic passes, never the input, so a proxy, a getter, or a value read twice cannot differ between the check and the parse. A refusal comes back as `{ valid: false, error }`.

The `error` is one root `ValidationError` whose `code` is `INPUT_OVER_BUDGET` or `INPUT_NOT_PLAIN_DATA`, the only kinds that carry a `code`, and `compositionToRender` throws either as a `CompositionValidationError` even when collecting, since nothing can render it. Pass `inputBudget` (`{ depth?, values?, characters? }`) in `createCompositionValidator`'s options or `createCompositionParser`'s to change a limit; one left out keeps its default. Zod still parses what passes recursively, so a `depth` raised past a few hundred nested containers can make `parse` and `validate` throw `RangeError` instead of refusing.

The budget guards the validator and the parser, not the schemas. `getCompositionSchemaForDefinitions` and a container's `schemaFor` schema parse nested containers recursively and check no budget, so run `checkInputBudget` before handing one untrusted input. A primitive's own `schema`, which the dispatcher's `validate` and inventory conformance parse, reads its child slots through `unresolvedBodyNodeSchema` and parses one level, and inventory conformance checks a `catalog.example` against the default budget before reading it.

## The semantic passes

| Pass                | Produces | Fires when                                                                                               |
| ------------------- | -------- | -------------------------------------------------------------------------------------------------------- |
| Duplicate node ids  | errors   | two nodes share an `id`                                                                                  |
| Empty surfaces      | warnings | the whole body renders nothing on a surface, checked per surface                                         |
| Missing `svgHeight` | warnings | a node renders to `svg` but declares no `metrics.svgHeight`, **only** when `sizesFromNodeHeights` is set |

That last gate is a runtime fact, not a per-node one: any frame that sums node heights makes the metric load-bearing, and a runtime whose frames are all fixed-size would otherwise collect warnings for a value nothing reads. A warning per node per slide is how a warning channel gets ignored.

Every warning names the surface it applies to, so a caller narrows before showing:

```ts
import { warningsForSurface } from '@elastic/isomer-sdk';
warningsForSurface(result, 'svg');
```

## Error messages

Every error is a `ValidationError`, `{ path, message, nodeType?, code? }`: `path` locates the value (`body[3].items[0].label`, empty for the document as a whole), `message` is a predicate, `code` is set only on a [refusal before parsing](#the-input-budget), and `nodeType` is the `type` of the innermost primitive node the path lands in, so a repair loop knows which primitive to fix. `formatValidationError` joins them into one sentence for a log or a model: `body[2].items[0].label (in kpi) is required`, or the message alone for a root finding. A node type, key, field, or enum value that is not a plain name prints JSON-quoted, and an echoed id always does, with every line terminator escaped so a finding stays on one line. The parser, the validator, the duplicate-id pass, and a dispatcher's `validate` all set `nodeType`; a node of unknown type has none to name, and a finding inside one, even nested in a known container, carries none rather than the container's. `formatZodIssues` does the conversion from Zod issues, with three cases worded centrally so per-schema messages carry no boilerplate: a missing required field is `is required`, an enum or discriminator mismatch is `must be one of: a, b, c`, unknown keys are `has unrecognized key(s): …` followed, on a primitive node, by `; its fields are …` (the node's declared fields, without `type`, `id`, and `surfaces`) or `; it declares no fields`, and Zod's default size wording becomes `must not be empty` or `must be at least 3 characters`. A schema's own message is never rewritten, so the `requiredString` / `enumOf` helpers and a `.min(1, { error })` of your own read the same way.

`compositionToRender(result, mode)` is the shared throw-or-collect switch: it raises `CompositionValidationError` only when the caller passed `'throw'`, or when `checkInputBudget` refuses the input, and otherwise returns the validator's copy, typed `CheckedComposition`, which is what every validating surface renders.

## JSON Schema

`buildCompositionJsonSchema(definitions, options)` projects the composition to draft-2020-12 for hosts that validate outside TypeScript. Two options carry weight: `reused: 'ref'` emits one named `$def` per primitive instead of inlining the union at every container, and `unrepresentable: 'any'` drops what JSON Schema cannot express, which is why anything stated only in a Zod refinement must also be stated in prose an agent will read.

`buildAuthoringJsonSchema` is the projection an agent reads. It starts from the validator schema, names the SDK's shared value schemas (`tone`, `displayValue`, `structuredValue`, `renderTheme`), inlines bare scalar `$defs` and `$ref`-only hops, drops `Number.MAX_SAFE_INTEGER` bounds and per-node `id`/`surfaces`, and accepts `describe` / `omitProperties` / extra pack `$defs` (`actionItem`, `badgeItem`) from the caller. The validator projection is unchanged: a node that emits `id` still parses.

## How the body-node union is built

For anyone touching this layer rather than calling it. The internal `resolveVocabulary(definitions)` returns both the union and the schema instance that actually landed in it per type:

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
