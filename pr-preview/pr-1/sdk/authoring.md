---
title: Authoring
description: Everything on the ./author entry serves one goal: making a Composition easy to produce, whether the author is a developer writing TypeScript or a model...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/authoring
---

# Authoring
Everything on the `./author` entry serves one goal: making a `Composition` easy to produce, whether the author is a developer writing TypeScript or a model reading a prompt.
Three front ends sit here — JSX, object builders, and agent prompts — and none of them is a renderer. They all produce plain composition JSON that the validator then checks like any other.

## JSX

An author writes what looks like React and gets a composition:
```tsx
const { Composition, toComposition, Stack, Note } = buildJsxShim(primitives);

toComposition(
  <Composition title="Checkout" subtitle="last 15m">
    <Stack>
      <Note body="Hello" />
    </Stack>
  </Composition>
);
```

Nothing renders. `defineAuthorComponent(type)` returns a component that always returns `null` and carries its node type on a symbol key — `Symbol.for('elastic.isomer.author_type')` — so the element tree is read as data rather than executed. `buildJsxShim(primitives)` builds a pack's whole front end from its primitive list: a `Composition` component, a PascalCase component per primitive (`slideFrame` → `SlideFrame`), a PascalCase component per branded child (`slideCard` → `SlideCard`), a `component(type)` factory, and `toComposition`, which walks the tree and converts each element into a node. Pass the registry tuple (`as const`) so those components stay typed. A `PrimitivePack` erases its primitives to `AnyPrimitiveDefinition[]`.
Child elements and text children are declared on the schema field, not in a parser. `fromChildren(childType, schema, options?)` and `fromTextChildren(schema, options?)` are identity wrappers. `z.infer` still reads the underlying schema; the shim reads the brand. `.describe()` clones, so describe the inner schema before wrapping it.
```ts
items: fromChildren('badge', z.array(badgeItemSchema).min(1).max(12).describe('Badges.')),
body: fromTextChildren(z.string().min(1).describe('Callout copy.')),
```

`options.text` copies leftover text onto that field of each child. `options.toItem` replaces the default prop copy when one element becomes a different record; declare it method-style so its props annotation is the child component's props. `fromTextChildren` collapses whitespace unless `{ collapseWhitespace: false }`. An explicit prop wins over children. Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Two primitives that brand the same child type with different item shapes throw `DUPLICATE_AUTHORED_CHILD` when the shim is built.
A primitive that declares `schemaFor` also hand-writes its node type and passes `toItem` when the child record holds the body-node union. Every other primitive's schema is its only declaration: the node type is `z.infer`.
Array-shaped authoring props accept either the array or JSX children:
```tsx
<BadgeGroup items={[{ label: 'Open' }]} />
<BadgeGroup>
  <Badge label="Open" />
</BadgeGroup>
```

Child-only components (`Badge`, `Stat`, `ListItem`, …) are not composition body nodes. Placing one directly under `<Composition>` throws `"badge" cannot be used as a composition body node.` Passing neither the array nor children yields `[]`, which the validator rejects via the schema `.min(1)`.
When a schema has no brand, the walk still fills a unique child-array field (`body`, `items`, …) from nested body nodes, and a unique single-node field from the first child. A container with more than one such field takes those props explicitly.
`flattenChildren`, `textFromChildren`, `withoutChildren`, `requireAuthorElement`, and `itemsFromChildren` remain for hosts that unwrap children themselves. `textFromChildren` collapses whitespace by default; pass `{ collapseWhitespace: false }` when indentation and newlines are significant.

## Object builders

The same specs without JSX, for hosts that would rather not add a transform:
```ts
const b = buildObjectBuilders(primitiveDefinitions);
b.callout({ tone: 'warning', title: 'Latency moved up', body: '…' });
// → { type: 'callout', tone: 'warning', title: 'Latency moved up', body: '…' }
```

`defineNodeBuilder<TNode>(type)` is the single-primitive form; the input type is `Omit<TNode, 'type'>`, so the builder supplies the discriminator and TypeScript checks the rest. `buildObjectBuilders` derives the whole map from a pack's primitives, which means a new primitive gets a builder with no additional wiring. Each builder is typed from its own primitive's schema (`BuilderMap`), the way `buildJsxShim` types its components, so `b.callout` accepts callout fields and nothing else; an inventory erased to `AnyPrimitiveDefinition[]` yields string-keyed builders that accept any fields.

## Agent prompts

The other kind of author is a model, and what it needs is not a component tree but a prompt. `buildAuthoringPrompt(profile, context)` assembles one from parts:
```ts
interface AuthoringPromptContext {
  guide: string;
  rules?: string;
  schema: JsonSchema;
  primitives: readonly PrimitiveCatalogEntry[];
  examples: readonly unknown[];
  views?: readonly AuthoringViewSummary[];
}
```

Three profiles, because the job differs:

| Profile                   | The model's task                                                           |
|---------------------------|----------------------------------------------------------------------------|
| `general`                 | Route to a registered view when one fits, otherwise compose                |
| `registered-view-router`  | Prefer an existing view matched on its `answers`; compose only as fallback |
| `compose-from-primitives` | Build a composition from the catalog, checked against the schema           |

`general` and `compose-from-primitives` inline the JSON Schema. The router profile does not: it requests a view by id and never composes a node. Each catalog bullet carries its `example` as compact JSON. `examples` is an extra host-supplied composition, capped at one, with `meta` stripped. The showcase arrays on `definition.examples` stay off the prompt; the conformance harness still reads them.
`createAuthoringPromptBuilder` and `createAgentAuthoringContextFactory` let a pack bind its own guide, rules, and defaults once so a host supplies only what varies. The structural half of the context — authoring schema, catalog, views — comes from the runtime's [authoring context](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context); the prose half belongs to the pack, because it describes a vocabulary rather than a composition.

## Next

[Primitives](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/primitives) for the catalog entries these prompts publish · [Authoring context](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context) for what a host hands a model