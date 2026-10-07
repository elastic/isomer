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

Child elements and text children are declared on the schema field, not in a parser. `fromChildren(childType, schema, options?)` and `fromTextChildren(schema, options?)` are identity wrappers. `z.infer` still reads the underlying schema; the shim reads the brand. The brand is read through `.optional()`, `.nullable()`, `.default()`, and `.readonly()`, so `fromChildren('item', items).optional()` still yields an `Item` component. Any other method, `.describe()` included, clones without the brand, so call it on the inner schema before wrapping. The field is optional when any of those layers is. Branding one schema instance again with a different configuration (another child type, `text` field, `toItem`, or `propsSchema`, one added or left out, or a text brand) throws an `IsomerError` with code `AUTHORED_SCHEMA_REUSED`; give each field its own schema.

```ts
items: fromChildren('badge', z.array(badgeItemSchema).min(1).max(12).describe('Badges.')),
body: fromTextChildren(z.string().min(1).describe('Callout copy.')),
```

`options.text` copies leftover text onto that field of each child. `options.toItem` replaces the default prop copy when one element becomes a different record; declare it method-style so its props annotation is the child component's props. `fromTextChildren` collapses whitespace unless `{ collapseWhitespace: false }`. An explicit prop wins over children. Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Children on a primitive with no branded field and no child slot throw `UNEXPECTED_CHILDREN` rather than being dropped. Two primitives that brand the same child type with different item or custom input props schemas throw `DUPLICATE_AUTHORED_CHILD` when the shim is built. Two types that capitalize to the same component name, such as `slideStat` and `SlideStat`, or a type named `composition`, throw `DUPLICATE_PRIMITIVE_TYPE`.

A primitive that declares `schemaFor` also hand-writes its node type and passes `toItem` when the child record holds the body-node union. Every other primitive's schema is its only declaration: the node type is `z.infer`.

Array-shaped authoring props accept either the array or JSX children:

```tsx
<BadgeGroup items={[{ label: 'Open' }]} />
<BadgeGroup>
  <Badge label="Open" />
</BadgeGroup>
```

A child's item schema can brand fields of its own, and those become components too, unless the child field passes `toItem`, which builds each item itself. With `stats: fromChildren('stat', z.array(statSchema), { text: 'label' })` and `delta: fromChildren('delta', deltaSchema, { text: 'label' }).optional()` inside `statSchema`:

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

A host that edits or displays a node in its JSX form, such as a composition editor, reads the same brands the shim does with `readAuthoredSpec(schema)`. It returns the schema's top-level branded fields: `children`, each with its `field`, `childType`, `textField`, whether it is an `array`, and its `itemSchema`, whose own brands `readAuthoredSpec` reads in turn; and `text`, each with its `field` and `collapseWhitespace`. A field is `optional` when children may be left out.

`textFromChildren` remains for hosts that unwrap text children themselves. `textFromChildren` collapses whitespace by default; pass `{ collapseWhitespace: false }` when indentation and newlines are significant.

### Declarations for an editor

`buildAuthoringDeclarations(schema, definitions, options?)` prints the schema from `buildAuthoringJsonSchema` as an ambient TypeScript module. It contains `<Type>Node` types with catalog guidance and prop descriptions, and a `BodyNode` union. `{ jsx: true }` adds the components and props types from the same authoring model `buildJsxShim` uses. Set `moduleName` to choose the module identity; the default is `@elastic/isomer-authoring`. Load the text as an editor extra lib and import its exports. The runtime's [authoring context](../../isomer-runtime/docs/authoring-context.md#editor-declarations) describes editor integration and the limits of structural checking.

`components` exposes every shim component under its actual key, including non-identifier keys. Named component exports include valid identifiers such as `Image` and `Record`, isolated from global library names. Each runtime in one editor needs a distinct module identity.

A `toItem` callback's annotated props cannot be recovered from its output schema. Supply `options.propsSchema` to describe those input props at runtime, excluding JSX children:

```ts
const cardProps = z.strictObject({ title: z.string() });
const items = fromChildren('card', z.array(z.object({ label: z.string() })), {
  propsSchema: cardProps,
  toItem(props) {
    return { label: props.title };
  },
});
```

The callback and child component props infer from `propsSchema` in input mode, and the declaration projects the same schema and allows JSX children for the callback to read. This metadata does not change the callback or add runtime validation; it must describe the callback's actual props. Without it, custom child props remain loose. Ordinary child props still come from their item schemas and authored fields.

`authoringBodySchema(schema)` is the matching JSON Schema for a body array, with only reachable `$defs`. Hosts accepting a single node must wrap it in an array before validation.

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
