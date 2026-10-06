# Authoring

Everything on the `./author` entry serves one goal: making a `Composition` easy to produce, whether the author is a developer writing TypeScript or a model reading a prompt.

Two front ends sit here — JSX and agent prompts — and neither is a renderer. Both lead to plain composition JSON that the validator then checks like any other.

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

Nothing renders. Each authoring component returns `null` and carries its node type on a symbol key — `Symbol.for('elastic.isomer.author_type')` — so the element tree is read as data rather than executed. `buildJsxShim(primitives)` builds a pack's whole front end from its primitive list: a `Composition` component, a PascalCase component per primitive (`slideFrame` → `SlideFrame`), a PascalCase component per branded child (`slideTerritory` → `SlideTerritory`), and `toComposition`, which walks the tree and converts each element into a node. The root element's `version`, `title`, `subtitle`, `theme`, and `meta` become the composition's own fields. Pass the registry tuple (`as const`) so those components stay typed. A `PrimitivePack` erases its primitives to `AnyPrimitiveDefinition[]`.

Child elements and text children are declared on the schema field, not in a parser. `fromChildren(childType, schema, options?)` and `fromTextChildren(schema, options?)` are identity wrappers. `z.infer` still reads the underlying schema; the shim reads the brand. The brand is read through `.optional()`, `.nullable()`, `.default()`, and `.readonly()`, so `fromChildren('item', items).optional()` still yields an `Item` component. Any other method, `.describe()` included, clones without the brand, so call it on the inner schema before wrapping. The field is optional when any of those layers is. Branding one schema instance again with a different configuration (another child type, `text` field, or `toItem`, one added or left out, or a text brand) throws an `IsomerError` with code `AUTHORED_SCHEMA_REUSED`; give each field its own schema.

```ts
items: fromChildren('badge', z.array(badgeItemSchema).min(1).max(12).describe('Badges.')),
body: fromTextChildren(z.string().min(1).describe('Callout copy.')),
```

`options.text` copies leftover text onto that field of each child. `options.toItem` replaces the default prop copy when one element becomes a different record; declare it method-style so its props annotation is the child component's props. `fromTextChildren` collapses whitespace unless `{ collapseWhitespace: false }`. An explicit prop wins over children. Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Children on a primitive with no branded field and no child slot throw `UNEXPECTED_CHILDREN` rather than being dropped. Two primitives that brand the same child type with different item shapes throw `DUPLICATE_AUTHORED_CHILD` when the shim is built. Two types that capitalize to the same component name, such as `slideStat` and `SlideStat`, or a type named `composition`, throw `DUPLICATE_PRIMITIVE_TYPE`.

A primitive that declares `schemaFor` also hand-writes its node type and passes `toItem` when the child record holds the body-node union. Every other primitive's schema is its only declaration: the node type is `z.infer`.

Array-shaped authoring props accept either the array or JSX children:

```tsx
<BadgeGroup items={[{ label: 'Open' }]} />
<BadgeGroup>
  <Badge label="Open" />
</BadgeGroup>
```

A child's item schema can brand fields of its own, and those become components too. With `stats: fromChildren('stat', z.array(statSchema), { text: 'label' })` and `delta: fromChildren('delta', deltaSchema, { text: 'label' }).optional()` inside `statSchema`:

```tsx
<Stats>
  <Stat value="42">
    Tests<Delta tone="success">+12 since yesterday</Delta>
  </Stat>
</Stats>
```

authors `{ label: 'Tests', value: '42', delta: { label: '+12 since yesterday', tone: 'success' } }`. A field whose schema is not an array takes one element, and a second throws `UNEXPECTED_CHILDREN`. An item's `text` field reads the text children beside its elements, and a branded item field is optional on the child's props, since its elements fill it.

Child-only components (`Badge`, `Stat`, `ListItem`, …) are not composition body nodes. Placing one directly under `<Composition>` throws `"badge" cannot be used as a composition body node.` Passing neither the array nor children leaves the field out, which the validator rejects as required unless the field is optional.

When a schema has no brand, the walk still fills a unique child-array field (`body`, `items`, …) from nested body nodes, and a unique single-node field from the first child. A container with more than one such field takes those props explicitly.

`textFromChildren` remains for hosts that unwrap text children themselves. `textFromChildren` collapses whitespace by default; pass `{ collapseWhitespace: false }` when indentation and newlines are significant.

## Agent prompts

The other kind of author is a model, and what it needs is not a component tree but a prompt. `buildAuthoringPrompt(profile, context)` assembles one from parts:

```ts
interface AuthoringPromptContext {
  guide: string; // the pack's prose
  rules?: string; // distilled generation rules; omitted when empty
  schema?: JsonSchema; // the authoring projection; the router profile does not inline it
  primitives: readonly PrimitiveCatalogEntry[]; // each bullet includes `example`
  catalog?: 'full' | 'index'; // `index` lists type and purpose only
  groups?: readonly PrimitiveGroup[]; // headings for the index
  examples: readonly unknown[]; // extra host-supplied compositions, not catalog copies
  views?: readonly AuthoringViewSummary[]; // registered views the model can request by id
  heading?: string; // defaults to '# View authoring'
  intro?: string; // replaces the profile's own framing sentence
}
```

Three profiles, because the job differs:

| Profile                   | The model's task                                                           |
| ------------------------- | -------------------------------------------------------------------------- |
| `general`                 | Route to a registered view when one fits, otherwise compose                |
| `registered-view-router`  | Prefer an existing view matched on its `answers`; compose only as fallback |
| `compose-from-primitives` | Build a composition from the catalog, checked against the schema           |

`general` and `compose-from-primitives` inline the JSON Schema. The router profile does not: it requests a view by id and never composes a node. Each catalog bullet carries its `example` as compact JSON. `examples` is an extra host-supplied composition, capped at one, with `meta` stripped. The showcase arrays on `definition.examples` stay off the prompt; the conformance harness still reads them.

### An index, then lookups

A large pack's full catalog and schema crowd out the question. With `catalog: 'index'` the prompt lists one line per primitive, sorted under the pack's [`groups`](packs.md#authoring) with the rest under "Other", and tells the model to ask for detail by type. Leave `schema` out too, and serve each request with the runtime's `describePrimitives(types)`: `formatPrimitiveEntry` prints each returned entry as the full catalog would, and the returned `$defs` are the slice of the authoring schema those types reach. A type or view id that would not survive printing bare, such as one holding a line break, is shown as a JSON string.

A pack binds its own guide and rules over `buildAuthoringPrompt` so a host supplies only what varies. The structural half of the context — authoring schema, catalog, views — comes from the runtime's [authoring context](../../isomer-runtime/docs/authoring-context.md); the prose half belongs to the pack, because it describes a vocabulary rather than a composition.

## Next

[Primitives](primitives.md) for the catalog entries these prompts publish · [Authoring context](../../isomer-runtime/docs/authoring-context.md) for what a host hands a model
