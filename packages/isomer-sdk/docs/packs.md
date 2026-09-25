# Packs

A pack is a vocabulary as a value: an id, a set of primitives, the optional surfaces every one of them implements, the palette its `svg` renderers require, and two facts about the vocabulary that only its author can state. `definePrimitivePack` builds one and checks it.

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

| Field             | Effect                                                                      |
| ----------------- | --------------------------------------------------------------------------- |
| `id`              | Names the pack in capability reports and error messages.                    |
| `surfaces`        | The optional surfaces (only `slack`) every primitive here implements.       |
| `primitives`      | The definitions. At least one, with unique types, or construction throws.   |
| `enhancements`    | Progressive enhancements this vocabulary supports, by id.                   |
| `slackAssetTypes` | Which node types are pictures rather than text.                             |
| `styleAdapter`    | Optional. This pack's HTML CSS, combined with the other packs'.             |
| `styleCollector`  | Optional. Derived from `styleAdapter.styleCollector` unless overridden.     |
| `theme`           | Optional. `themeBound<T>()` so the pack infers `PrimitivePack<T>`.          |
| `authoring`       | Optional. This pack's `describe` and `omitProperties` for the agent schema. |

What comes back adds `types`, a set for duplicate detection across packs, and normalizes the two optional fields. `styleCollector` is read from `styleAdapter.styleCollector` when the pack does not set it; set it only for a pack whose hooks collect into a shape its adapter does not create.

## `surfaces` reports an intent

`slack` is the only member, and it stays optional per primitive: the dispatcher converts the mandatory markdown to Block Kit, so declaring it says what the pack aims at rather than imposing a requirement. Omit the field entirely for a pack that renders Slack through that fallback.

There is nothing to declare for `svg`. Every pack reaches the image surface through its `react` renderers, and whether a runtime _has_ that surface depends on a frame, which is a host input rather than a pack's to promise.

`extendPrimitivePack(pack, primitives)` adds primitives and keeps the declared surfaces. A type the pack already owns throws `DUPLICATE_PRIMITIVE_TYPE`, as a repeated type in `definePrimitivePack` does; `composePacks` reports the cross-pack case.

## `slackAssetTypes`

Which of your node types are self-contained pictures. A channel that cannot draw them inline uploads an image instead: the Slack dispatcher swaps such a node for an `image` block and an upload request, so a chart arrives as a PNG rather than as a markdown approximation of one.

It is declared here because it is a fact about the vocabulary. A host composing packs it did not write cannot be expected to know which of your types are charts.

## `enhancements`

Progressive enhancements the HTML surface may apply, each an id, a content gate, and usually a script:

```ts
enhancements: [
  {
    id: 'tableSort',
    appliesTo: (body, walk) =>
      someBodyNode(body, 'react', (n) => (n as PrimitiveNode).type === 'table', walk),
    script: `root.querySelectorAll('[data-sortable]').forEach(/* … */);`,
  },
],
```

Ids are open strings rather than a closed union, so a second pack can register one without editing a shared type; a runtime rejects duplicate ids across packs. `appliesTo` receives the composition's child walker, so a match nested inside another pack's container is still found, and gating on content is what keeps a view with no matching node from shipping the script at all.

The script is a function body with `root`, the render's `.isomer` section, in scope. Each one runs in its own function, so two enhancements can declare the same `const` and a top-level `return` ends only its own script. It must not look for its root through `document.currentScript`, which is `null` inside a shadow root.

The script must address markup through `data-*` attributes, never class names: class names are minified per render, so a selector written against one is a contract nothing checks. An event meant for the host sets `composed: true` as well as `bubbles: true`; `bubbles` alone stops at a shadow boundary.

An enhancement the host drives, rather than one that runs in the page, omits `script`. One that finds nodes with `findNodeElements` declares `anchors: true`, so a render that resolves it carries [node anchors](rendering.md#node-anchors).

## `authoring`

A pack's own contribution to the runtime's authoring JSON Schema: `describe` ($def id to description) and `omitProperties` ($defId.property paths to drop), scoped to this pack's own primitives:

```ts
definePrimitivePack({
  id: 'metrics',
  primitives: […],
  authoring: { describe: { kpi: 'A single measured value.' } },
});
```

A runtime composing several packs merges every pack's `authoring` into one options object before building the schema, so no host hand-merges each pack's `describe`/`omitProperties` itself. The runtime's own `authoring` option is applied last and wins on conflict.

## The theme a pack requires

A pack's nodes are drawn inside a frame, and `PrimitivePack<TTheme>` is where the pack states the palette that frame must supply. `definePrimitivePack` infers `TTheme` from `theme`. Omit it and the pack is `PrimitivePack<unknown>`, which is also what bare `PrimitivePack` means: requires nothing, fits any runtime. A pack that needs a frame to carry tokens passes the bound at the definition:

```ts
export const elasticPack = definePrimitivePack({
  id: 'elastic',
  primitives: […],
  theme: themeBound<SvgRenderTheme>(),
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
type Registered = (typeof myPackPrimitives)[number]['examples'][number];
type Assert<T extends true> = T;
type _A = Assert<[Registered] extends [BodyNode] ? true : false>;
type _B = Assert<[BodyNode] extends [Registered] ? true : false>;
```

Tuple-wrap both sides so neither distributes over the union. Between the two checks, a primitive cannot be half-registered: the directory check catches what is absent from both lists, the type assertion catches what is in one but not the other.

## Why it is shaped this way

**The theme requirement is a phantom property, not a method.** `PrimitivePack<TTheme>` carries `readonly __theme?: (theme: TTheme) => void`, never present at runtime and never read. A property rather than a method, so `strictFunctionTypes` checks it contravariantly. A method signature is bivariant, which would let a pack needing richer tokens sit in a slot supplying fewer and then read a field nothing supplies, the exact failure the marker exists to prevent.

**`AnyPrimitivePack` is `PrimitivePack<never>`.** `never` is assignable to every requirement, so it accepts every pack.

**Registration is a check, not a generator.** The registry stays hand-written and readable, there is no config file or build step to learn, and the authoring fronts need no generation either: `buildJsxShim` and `buildObjectBuilders` derive the JSX and builder APIs from the registry array at runtime. Deriving the union from the registry in _source_ does not compile, since container primitives import the content-node alias and inferring the registry's type closes that cycle (`TS7022`).

## Next

[Primitives](primitives.md) · [Frame](frame.md)
