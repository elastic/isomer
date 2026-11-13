# Packs

A pack is a vocabulary as a value: an id, a set of primitives, the optional surfaces every one of them implements, the palette its `snapshot` renderers require, and two facts about the vocabulary that only its author can state. `definePrimitivePack` builds one and checks it.

```ts
import { definePrimitivePack } from '@elastic/isomer-sdk';

export const metricsPack = definePrimitivePack({
  id: 'metrics',
  surfaces: ['slack'],
  primitives: [kpi, sparkline],
});
```

This page is the pack **contract**. Composing packs into a runtime is the [runtime's packs page](../../isomer-runtime/docs/packs.md).

## What you declare

| Field             | Effect                                                                         |
| ----------------- | ------------------------------------------------------------------------------ |
| `id`              | Names the pack in capability reports and errors. Unique across composed packs. |
| `version`         | Optional. The vocabulary's version, a positive integer; absent means 1.        |
| `migrations`      | Optional. One step per earlier version; keys exactly `1 .. version - 1`.       |
| `surfaces`        | The optional surfaces (only `slack`) every primitive here implements.          |
| `primitives`      | The definitions. At least one, with unique types, or construction throws.      |
| `enhancements`    | Progressive enhancements this vocabulary supports, by id.                      |
| `slackAssetTypes` | Which of the pack's node types are pictures rather than text.                  |
| `styleAdapter`    | Optional. This pack's HTML CSS; a runtime runs one pack's adapter.             |
| `styleCollector`  | Optional. Derived from `styleAdapter.styleCollector` unless overridden.        |
| `authoring`       | Optional. `describe` and index `groups` for agents.                            |

`surfaces` is advisory: dispatch and `describeCapabilities` follow each primitive's own `renderers.slack`, so a primitive without one renders, and reports, Slack as a markdown fallback.

What comes back adds `contract`, the `PACK_CONTRACT_VERSION` it was built for, `types`, the types it registers now, and `icons`, each primitive's [icon](primitives.md#names-and-icons) by type for the primitives that declare one, so a host listing them need not walk `primitives`. `composePacks` builds one such map from every pack's definitions, so a pack built by an SDK without `icons` composes too. Both are frozen null-prototype dictionaries, so an absent type, even `constructor`, reads `undefined`. It also normalizes the two optional fields. `styleCollector` is read from `styleAdapter.styleCollector` when the pack does not set it; set it only for a pack whose hooks collect into a shape its adapter does not create.

## `surfaces` reports an intent

`slack` is the only member, and it stays optional per primitive: the dispatcher converts the mandatory markdown to Block Kit, so declaring it says what the pack aims at rather than imposing a requirement. Omit the field entirely for a pack that renders Slack through that fallback.

There is nothing to declare for `snapshot`. Every pack reaches the `snapshot` surface through its `react` renderers, and whether a runtime _has_ that surface depends on a frame, which is a host input rather than a pack's to promise.

A repeated type in `definePrimitivePack` throws `DUPLICATE_PRIMITIVE_TYPE`; `composePacks` reports the cross-pack case, and a pack `id` two packs share throws `DUPLICATE_PACK_ID`. A `slackAssetTypes` entry the pack does not register throws `UNKNOWN_PRIMITIVE_TYPE`, as an unknown type in `authoring.groups` does.

## `version` and `migrations`

`version` is the vocabulary's version: a positive integer, absent meaning 1. Raise it on any change after which a previously valid document no longer validates, or means something else:

- a tighter limit;
- a layout change that takes room a document used;
- a change in meaning with the same JSON shape.

Adding an optional field does not raise it. The cost, which is accepted: a runtime that predates the field reports `unrecognized key` rather than "newer than me".

`migrations` holds one step for each earlier version: key `k` carries a document from `k` to `k + 1`, so the keys are exactly `1 .. version - 1`.

```ts
export const obsPack = definePrimitivePack({
  id: 'obs',
  version: 2,
  migrations: { 1: obsV1 },
  primitives: [obsMetric, obsAlertList, obsSection],
});
```

A step is a `PackMigration`, and every key in it is a node `type` as it was at the step's source version:

| Field         | Effect                                                                                                                                         |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `nodes`       | Old type to transform. Returning `null` deletes the node.                                                                                      |
| `children`    | Child slots at the source version, for every type whose slots differ from the current definition, including types that no longer exist.        |
| `composition` | A whole-document step, run after `nodes`.                                                                                                      |

A renamed container needs a `children` entry even when its slots did not move: no current definition exists under the old name, so nothing else says where its children are.

A `version` that is not a positive integer throws `INVALID_PACK_VERSION`. Missing, extra, or malformed steps throw `INVALID_PACK_MIGRATIONS`. `composePacks` runs both checks again, for a pack that did not come from `definePrimitivePack`.

### Ownership

A pack owns its current types plus every type any step names (`ownedTypes(pack)`). Within one pack, a step may name a current type, as a same-name field migration does, and a type may recur across steps. Across composed packs, owned types must not overlap: `composePacks` throws `DUPLICATE_PRIMITIVE_TYPE` and names both packs and the step, as in `primitive type "alertList" registered by "obs" (historical, migrations[1]) and "sec"`. A stored document can still hold a retired name, so it is never reused with another meaning.

### The pack contract

`PACK_CONTRACT_VERSION` is the shape of `PrimitiveDefinition` and `PrimitivePack` this SDK runs. It is raised only when they change in a way that stops a pack built by an earlier SDK from running. `definePrimitivePack` records it on the pack as `contract`, and `composePacks` throws `INCOMPATIBLE_PACK_CONTRACT` for a pack built for another one.

A pack built by an SDK that predates versions has no `version`, `migrations`, or `contract`. All three are optional on `PrimitivePack`, and `composePacks` reads them as 1, none, and 1, so such a pack still composes.

### The stamp

A composition records the version each pack's nodes were written in, in the envelope's `packs`: `{ "type": "view", "packs": { "slides": 2, "obs": 1 }, "body": [...] }`. See [Composition](composition.md#the-pack-stamp). `describeCapabilities` reports each pack's version by id as `packs`.

## `slackAssetTypes`

Which of your node types are self-contained pictures. A channel that cannot draw them inline uploads an image instead: the Slack dispatcher swaps such a node for an `image` block and an upload request, so a chart arrives as a PNG rather than as a markdown approximation of one.

It is declared here because it is a fact about the vocabulary. A host composing packs it did not write cannot be expected to know which of your types are charts.

## `enhancements`

Progressive enhancements the HTML surface may apply, each an id, a content gate, and usually a script:

```ts
enhancements: [
  {
    id: 'tableSort',
    name: 'Sortable tables',
    description: 'Adds click-to-sort headers on every table in the composition.',
    appliesTo: (body, walk) =>
      someBodyNode(body, 'react', (n) => (n as PrimitiveNode).type === 'table', walk),
    script: `root.querySelectorAll('[data-sortable]').forEach(/* … */);`,
  },
],
```

`name` and `description` are optional host-facing metadata; ids stay the stable keys for `enhancements` render options and `context.enhancements`. A runtime exposes the flattened definitions on `enhancements` so hosts can label controls without maintaining their own id-to-copy maps.

Ids are open strings rather than a closed union, so a second pack can register one without editing a shared type; a runtime rejects duplicate ids across packs. `appliesTo` receives the composition's child walker, so a match nested inside another pack's container is still found, and gating on content is what keeps a view with no matching node from shipping the script at all.

The script is a function body with `root`, the render's `.isomer` section, in scope. Each one runs in its own function, so two enhancements can declare the same `const` and a top-level `return` ends only its own script. It must not look for its root through `document.currentScript`, which is `null` inside a shadow root.

The script must address markup through `data-*` attributes, never class names: class names are minified per render, so a selector written against one is a contract nothing checks. An event meant for the host sets `composed: true` as well as `bubbles: true`; `bubbles` alone stops at a shadow boundary.

An enhancement the host drives, rather than one that runs in the page, omits `script`. One that finds nodes with `findNodeElementPairs` declares `anchors: true`, so a render that resolves it carries [node anchors](rendering.md#node-anchors).

## `authoring`

A pack's own contribution to the runtime's authoring JSON Schema. A primitive's `catalog.description` — or the root schema's `.describe()`, which `definePrimitive` copies onto the catalog when `description` is omitted — is the `$def` description. `describe` ($def id to description) still names shared defs such as `tone`, and overrides a catalog description on conflict:

```ts
definePrimitive({
  type: 'kpi',
  catalog: {
    type: 'kpi',
    description: 'A single measured value.',
    // …
  },
  // …
});

definePrimitivePack({
  id: 'metrics',
  primitives: […],
  authoring: { describe: { tone: 'How strongly to read the value.' } },
});
```

A runtime composing several packs merges every pack's `authoring` into one options object before building the schema, so no host hand-merges each pack's `describe` itself. The runtime's own `authoring` option is applied last and wins on conflict.

`groups` titles sets of this pack's primitive types for an [index catalog](authoring.md#an-index-then-lookups), in the order they are listed. A group naming a type the pack does not register, or a type in two groups, throws at `definePrimitivePack`; a type in no group is listed under "Uncategorized" (`UNCATEGORIZED_GROUP_TITLE`). That title is reserved, and a title used twice in one pack throws `INVALID_PACK_GROUPS`. Groups belong to the pack, not the primitive, so a primitive reused in another pack brings no heading with it.

### Stating what a refinement checks

JSON Schema cannot express a Zod refinement, so the authoring schema drops every `.refine`, `.superRefine`, `.check(z.refine(…))`, and `z.custom`, and an agent learns the rule only from a description it reads. `customChecksOf` from `@elastic/isomer-sdk/testing` returns each custom check reachable from a schema, as the object Zod holds, so a test can hold every one to a stated rule. Record the rule when you make the check:

```ts
import { authoringSchemaSubset, buildAuthoringJsonSchema } from '@elastic/isomer-sdk';
import { customChecksOf } from '@elastic/isomer-sdk/testing';

// Filled by the helpers the pack makes its checks with.
declare const ruleOf: WeakMap<object, string>;

const authoring = buildAuthoringJsonSchema(myPackPrimitives);
const schemas = new Set(myPackPrimitives.map(({ schema }) => schema));

it.each(myPackPrimitives)('$type states its checks', ({ type, schema }) => {
  const stated = JSON.stringify(authoringSchemaSubset(authoring, [type]));
  const checks = customChecksOf(schema, { skip: (nested) => schemas.has(nested) });
  for (const check of checks) {
    expect(stated).toContain(ruleOf.get(check));
  }
});
```

`skip` stops the walk at another primitive's schema, which is checked on its own. The slides pack's `src/stated_rules.test.ts` is a complete version.

## The theme a pack requires

A pack's nodes are drawn inside a frame, and `PrimitivePack<TTheme>` is where the pack states the palette that frame must supply. `TTheme` is `definePrimitivePack`'s type argument. Omit it and the pack is `PrimitivePack<unknown>`, which is also what bare `PrimitivePack` means: requires nothing, fits any runtime. A pack that needs a frame to carry tokens names the bound at the definition:

```ts
export const elasticPack = definePrimitivePack<SnapshotTheme>({
  id: 'elastic',
  primitives: […],
});
```

A runtime resolves `TTheme` from its packs and requires every frame in its map to supply it, which is why packs wanting different palettes belong in different runtimes. [Frame](frame.md) has the failure mode and the error message it produces. A slot that must hold packs of every palette, such as the runtime's own fields, is `AnyPrimitivePack`.

## What a pack does not decide

Not the document. [Frame](frame.md) is a separate value a host passes to the runtime, so a pack is purely additive: composing two packs composes their node types and nothing else.

Not composition, either. Duplicate types across packs, renderer overrides, and which frame surrounds a given render are all the assembly layer's, because only it sees the whole set. `composePacks(packs)` is the structural owner of the flattened `definitions` array the schema cache keys on; hold that array rather than `packs.flatMap(…)` per call. It throws on a node type or enhancement id claimed by two packs, naming every offender in one message.

## Keeping the registry honest

A pack keeps two hand-written lists, the registry array and its body-node union, and nothing in the type system relates either to the directory they describe. A primitive missing from **both** leaves them agreeing with each other, so it compiles and every other test passes while the primitive is unreachable.

`assertPackRegistrationComplete` reads the directory and fails on that case:

```ts
import { assertPackRegistrationComplete } from '@elastic/isomer-sdk/testing';

it('registers every primitive directory', async () => {
  await assertPackRegistrationComplete({
    primitivesDir: new URL('./primitives/', import.meta.url),
    registered: myPackPrimitives,
  });
});
```

It reports the folder, the export to import, and the reminder to extend the union, so the failure carries its own fix. Pass `ignore` for subdirectories that hold no primitive.

Pair it with a type-level assertion that the two lists agree, which belongs in a test file because a test is outside the build graph:

```ts
type Registered = ExampleNode<
  (typeof myPackPrimitives)[number]['examples'][number]
>;
type Assert<T extends true> = T;
type _A = Assert<[Registered] extends [BodyNode] ? true : false>;
type _B = Assert<[BodyNode] extends [Registered] ? true : false>;
```

`ExampleNode` unwraps a named example to its node. Tuple-wrap both sides so neither distributes over the union. Between the two checks, a primitive cannot be half-registered: the directory check catches what is absent from both lists, the type assertion catches what is in one but not the other.

## Why it is shaped this way

**The theme requirement is a phantom property, not a method.** `PrimitivePack<TTheme>` carries `readonly __theme?: (theme: TTheme) => void`, never present at runtime and never read. A property rather than a method, so `strictFunctionTypes` checks it contravariantly. A method signature is bivariant, which would let a pack needing richer tokens sit in a slot supplying fewer and then read a field nothing supplies, the exact failure the marker exists to prevent.

**`AnyPrimitivePack` is `PrimitivePack<never>`.** `never` is assignable to every requirement, so it accepts every pack.

**Registration is a check, not a generator.** The registry stays hand-written and readable, there is no config file or build step to learn, and the authoring fronts need no generation either: `buildJsxShim` derives the JSX API from the registry array at runtime. Deriving the union from the registry in _source_ does not compile, since container primitives import the content-node alias and inferring the registry's type closes that cycle (`TS7022`).

## Next

[Primitives](primitives.md) · [Frame](frame.md)
