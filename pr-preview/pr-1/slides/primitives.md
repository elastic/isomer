---
title: Authoring a primitive
description: Each primitive lives in its own directory under src/primitives/<type>/. Folder-local exports use the definePrimitive keys (catalog, examples, schema,...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/slides/primitives
---

# Authoring a primitive
Each primitive lives in its own directory under `src/primitives/<type>/`. Folder-local exports use the `definePrimitive` keys (`catalog`, `examples`, `schema`, `react`) so the index can import them without aliases. The React file is a `(node, env)` renderer, not a component.

## File layout


| File          | What it holds                                                                                                                                                                  |
|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `schema.ts`   | The declaration. The Zod schema, and `export type Node = z.infer<typeof schema> & PrimitiveNode`. Field notes live on `.describe()`, which also reaches the agent JSON Schema. |
| `types.ts`    | Only when the primitive declares `schemaFor`. Those nodes hold the body-node union, so the type stays a hand-written interface.                                                |
| `catalog.ts`  | Agent-facing copy: `purpose`, `useWhen`, `avoidWhen`, one `example`.                                                                                                           |
| `examples.ts` | `example` plus `examples`, used by the conformance harness and the authoring prompt.                                                                                           |
| `react.tsx`   | The React renderer, exported as `react`. It serves the `svg` surface too.                                                                                                      |
| `index.tsx`   | `definePrimitive`, renderer wiring, and inline text/markdown unless those surfaces are large enough for their own files.                                                       |

A primitive holds no values of its own. Everything it renders lives in its group under `SLIDE_THEME` (`src/theme/theme.ts`), which the CSS modules read.
Each primitive's `catalog.ts` and `examples.ts` ship in `dist` beside its renderers, because the authoring prompt and the conformance harness read them from the built package. What `tsconfig.build.json` excludes is `src/examples/**`: the worked deck and its snapshot output, which are type-checked but never published.

## Before you add a value: one source per rendered value

Every length on the spacing, type, or radius scale and every scheme-varying color has exactly one authoring source, and that source is always `SLIDE_THEME` in `src/theme/theme.ts`. A spacing value comes from `size` (a 4px grid, `m` being the 16px base), type from `font.size` / `font.heading` / `font.weight`, tracking from `font.tracking`, a corner from `radius`, and a scheme-varying color from `color`. Each primitive then has its own group — `frame`, `cards`, `bullets` — that composes those into the values its CSS module reads. A raw `px(...)` belongs there only when the value genuinely has no place on the scale, and it says why. Do not type a literal into `theme/modules.ts` that the theme could name — `bullets.markerGlyph` is there because a marker is a value, not a decoration.
This does not reach every literal in `theme/modules.ts`: a hairline border (`1px solid`), `tab-size: 2`, a `color-mix()` percentage, and a fixed `grid-template-columns: repeat(2, …)` are CSS mechanics rather than design tokens, and stay inline.
[Distillate](https://elastic.github.io/distillate/) theme leaves are not color-only: a plain `string` becomes a CSS custom property with identical light/dark values; `lightDark(light, dark)` is the scheme-varying color helper; a `ScaleToken` (`cq` / `scaleToken`, wrapped here as `px` and `literal`) inlines as a literal and cannot vary across schemes or overlays. This pack uses `ScaleToken` for everything outside `color` because the 16:9 canvas is fixed — a host that wants different geometry replaces the frame (`docs/document.md`, `docs/theme.md`), not a token. Reach for a string leaf only when a value is meant to be host-themeable.
A CSS module that branches on an enum field uses `variants(domain, factory)` with the domain array already in `src/theme/variants.ts`. Do not add a private `switch`.

## Drawing inside an `svg`

The image surface renders this pack's React tree against this pack's stylesheet, so a primitive styles itself with Distillate handles and needs no second renderer. That holds everywhere **except inside an inline `<svg>`**, which is the one place the stylesheet does not reach.
An image backend does not lay out SVG children as part of the document. It lifts the element out, hands the markup to an SVG parser as a standalone sub-document, and composites the result — so a `<rect>` in there is no longer a node the stylesheet can match, and the document's custom properties are not in scope for it. A class that works perfectly in HTML paints nothing, and the shape rasterizes black.
So a shape inside an `<svg>` carries its own paint as a presentation attribute, beside the class it uses in the browser:
```tsx
<path d="…" fill="#00BFB3" />
```

Both surfaces read the one they can. A presentation attribute carries no specificity, so any class rule beats it and HTML stays scheme-aware through the custom property; the image has only the attribute, so that is what it draws. The header mark inlines `docs/logo.svg` as `ISOMER_LOGO_PATHS`. Those fills are brand-fixed literals, the same way `ELASTIC_LOGO_PATHS` is, so the paths do not take a scheme class.
Two traps worth naming:
- **`var(--x, #fallback)` is worse than `#fallback`.** SVG parsers generally do not implement custom properties, and rather than taking the fallback they discard the whole declaration — so the shape ends up black, which is the failure the fallback looked like it was preventing. Write the literal.
- **The attribute cannot vary by scheme.** There is no stylesheet behind it, so it is one value for both. Treat a mark drawn this way as brand-fixed, the way `ELASTIC_LOGO_PATHS` already is, and keep scheme-varying color for everything outside the `<svg>`.


## Writing a leaf primitive

```tsx
import { catalog } from './catalog';
import { examples } from './examples';
import { schema } from './schema';
import { react } from './react';

export const slideTitlePrimitive = definePrimitive({
  type: 'slideTitle',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text: (node) => [node.eyebrow, node.title].filter(Boolean).join('\n'),
    markdown: (node) => `## ${node.title}`,
  },
});
```

Leave both type arguments inferred. Passing `TNode` alone widens the schema and drops field brands. The node type is `z.infer<typeof schema> & PrimitiveNode`, exported from `schema.ts`.
There is no `svg` renderer, and adding one is the mistake this pack exists to rule out. The image surface lays out the `react` tree against the pack's stylesheet, so a second hand-authored tree is a second thing to keep in sync and a second thing to get wrong. [Drawing inside an `svg`](#drawing-inside-an-svg) covers the one place that equivalence stops.
Keep text and markdown inline when they are a few lines; add `text.ts` / `markdown.ts` only when they grow.

## Children come from the schema field

A field filled from JSX children is branded on the schema. `fromChildren` and `fromTextChildren` are identity wrappers: `z.infer` is unchanged, and `buildJsxShim` reads the brand for the child component and for parsing. Describe the inner schema first — `.describe()` clones the schema and drops the brand.
```ts
cards: fromChildren(
  'slideCard',
  z.array(cardSchema).min(1).describe('Cards to lay out.'),
  { text: 'body' }
),
```

`buildJsxShim(slideDeckPrimitives)` then includes `SlideCard`, typed from the array element. `text: 'body'` copies leftover text children onto that field. An explicit `cards` prop wins over children. Placing `<SlideCard>` directly under `<Composition>` throws, because it is not a body node.
A string field uses `fromTextChildren`. `slideCode` keeps newlines:
```ts
code: fromTextChildren(z.string().min(1).describe('Source to display.'), {
  collapseWhitespace: false,
}),
```

```tsx
<SlideCode label="Composition" language="ts">{`const spec: Composition = {
  type: "view",
  body: [node],
};`}</SlideCode>
```

Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Two primitives that brand the same child type with different item shapes throw `DUPLICATE_AUTHORED_CHILD` when the shim is built.
One branch: a primitive that declares `schemaFor` also hand-writes its node type. The body-node union is injected per composition, so it cannot appear in a static schema — which is why `schemaFor` exists — and `z.infer` cannot name that cycle (`TS2456`, `TS7022`). Brand the child field the same way. When one child element is not the array element, pass `toItem`; its props annotation is the child component's props. `slideFrame`, `slideSplit`, and `slideStack` are that branch. Every other primitive's schema is its only declaration.

## Writing a container primitive

Containers (frame, split, stack) need three more fields:
```ts
schemaFor: (bodyNodeSchema) =>
  schema.extend({ items: bodyNodes(bodyNodeSchema, schema.shape.items) }),
children: (node) =>
  node.items.map((child, index) => ({ node: child, path: `items[${index}]` })),
renderers: {
  react,
  text: (node, { scope }) => renderChildren(node.items, scope, 'text'),
  markdown: (node, { scope }) => renderChildren(node.items, scope, 'markdown'),
},
```

- `schemaFor` replaces `unresolvedBodyNodeSchema` in the child slot with the runtime's full discriminated union so foreign nodes validate correctly. `bodyNodes` (`src/primitives/define.ts`) builds that slot and carries over the field's `.describe()`, which `.extend()` would otherwise drop.
- `children` exposes nested nodes to the duplicate-id checker and the empty-surface checker.
- `renderChildren` (`src/render/children.ts`) dispatches each child through `scope.renderText` / `scope.renderMarkdown`, so a foreign node inside a container renders rather than disappearing, and drops empties before joining.

A container that also draws chrome of its own sets two more. `hasOwnContent: () => true` keeps it on a surface when every child is hidden there, and `metrics.svgHeight` reports its drawn height to a frame that sums node heights. `slideFrame` sets both because it owns the 16:9 canvas; `slideSplit` and `slideStack` set neither, since they draw nothing and take their height from their children.

## Registering the primitive

`src/registry.ts` is hand-maintained. Add the import and include it in `slideDeckPrimitives`:
```ts
import { myNewPrimitive } from './primitives/my_new_type';

export const slideDeckPrimitives = [
  …,
  myNewPrimitive,
] as const;
```

Also add the node type to the `BodyNode` union in `src/body_node.ts`. The two lists cannot be collapsed into one — the container `types.ts` files import `SlideContentNode`, so deriving the union from the registry closes that cycle at the value level (`TS7022`). `src/registry.test.ts` holds both guards: a type-level assertion that the two lists agree in both directions, and `assertPackRegistrationComplete`, which reads `src/primitives/` and fails when a directory is in neither list. Forgetting a step fails the build with the lines to add.

## Authoring with JSX

`buildJsxShim(slideDeckPrimitives)` turns the primitives into components, so a deck reads as markup instead of a hand-built node tree:
```tsx
import { buildJsxShim } from '@elastic/isomer-sdk/author';

const { Composition, SlideFrame, SlideTitle, toComposition } =
  buildJsxShim(slideDeckPrimitives);

const composition = toComposition(
  <Composition title="Title slide">
    <SlideFrame chapter="01 · Primitives" footer="Elastic" layout="title">
      <SlideTitle title="One composition, every surface." size="hero" />
    </SlideFrame>
  </Composition>
);
```

`toComposition` walks the tree back into the plain `Composition` value every surface renders from — JSX is authoring sugar, not a second representation. `src/examples/deck/index.tsx` is the full worked version, covering every primitive's shim.

## React hosts

A host that wants to preview one primitive outside a full deck uses `StandaloneSlideNode`, which wraps a single content node in the deck-root scope and inlines the pack's stylesheet:
```tsx
import { StandaloneSlideNode } from '@elastic/isomer-primitives-slides';

<StandaloneSlideNode node={{ type: 'slideTitle', title: 'Preview' }} />;
```

`slideStylesheet()` returns the same CSS as a standalone string, for a host that mounts the pack's React tree itself and wants to inject the `<style>` tag separately rather than through `StandaloneSlideNode`.