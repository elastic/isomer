# Authoring a primitive

Each primitive lives in its own directory under `src/primitives/<type>/`. Folder-local exports use the `definePrimitive` keys (`catalog`, `examples`, `schema`, `react`) so the index can import them without aliases. The React file is a `(node, env)` renderer, not a component.

## File layout

| File | What it holds |
| --- | --- |
| `schema.ts` | The declaration. The Zod schema, and `export type Node = z.infer<typeof schema> & PrimitiveNode`. Field notes live on `.describe()`, which also reaches the agent JSON Schema. |
| `types.ts` | Only when the primitive declares `schemaFor`. Those nodes hold the body-node union, so the type stays a hand-written interface. |
| `catalog.ts` | Agent-facing copy: `purpose`, `useWhen`, `avoidWhen`, one `example`. |
| `examples.ts` | `example` plus `examples`, used by the conformance harness and the authoring prompt. |
| `styles.ts` | The primitive's Distillate module, reading only `slideDistillery.tokens`. `src/stylesheet.ts` collects every module. |
| `react.tsx` | The React renderer, exported as `react`. It serves the `svg` surface too. |
| `index.tsx` | `definePrimitive`, renderer wiring, and the `text`, `markdown`, and `slack` renderers. |
| `index.test.ts` | Schema rejections and every surface's output for the primitive. |
| `build.ts` | Only for an ordered primitive: the parts a [build](builds.md) reveals one per click. |
| `fit.ts` | Only for a length-sensitive primitive: the load or width estimate that picks its size step ([Size steps](theme.md#size-steps)). |

A primitive holds no values of its own. Everything it renders lives in its group under `SLIDE_THEME` (`src/theme/components/<group>.ts`, assembled by `src/theme/theme.ts`), which its `styles.ts` reads.

Each primitive's `catalog.ts` and `examples.ts` ship in `dist` beside its renderers, because the authoring prompt and the conformance harness read them from the built package. What `tsconfig.build.json` excludes is `src/examples/**`: the worked deck and its snapshot output, which are type-checked but never published.

## Before you add a value: one source per rendered value

Every length on the spacing, type, or radius scale and every scheme-varying color has exactly one authoring source, and that source is always `SLIDE_THEME`. The scales live in `src/theme/base.ts`: spacing from `space` (keyed by pixel value on the fixed canvas, `space.px48`), type from the `type` roles or `font.size` / `font.weight` / `font.tracking` / `font.lineHeight`, corners from `radius`, strokes from `stroke`, and scheme-varying color from `color` and `inverse`. Each primitive then has its own group in `src/theme/components/` that composes those into the values its module reads. A raw `px(...)` belongs there only when the value genuinely has no place on a scale, and it says why. Do not type a literal into a `styles.ts` that the theme could name — `bulletList.crossGlyph` is a theme value because a marker is a value, not a decoration.

This does not reach every literal in a module: `1fr`, `minmax(0, …)`, `flex: none`, `50%`, and a fixed `repeat(2, …)` are CSS mechanics rather than design tokens, and stay inline.

[Distillate](https://elastic.github.io/distillate/) theme leaves are not color-only: a plain `string` becomes a CSS custom property with identical light/dark values; `lightDark(light, dark)` is the scheme-varying color helper; a `ScaleToken` (`cq` / `scaleToken`, wrapped here as `px` and `literal`) inlines as a literal and cannot vary across schemes or overlays. This pack uses `ScaleToken` for everything outside `color` and `inverse` because the 16:9 canvas is fixed — a host that wants different geometry replaces the frame (`docs/document.md`, `docs/theme.md`), not a token. Reach for a string leaf only when a value is meant to be host-themeable.

A CSS module that branches on an enum field uses `variants(domain, factory)` with the domain array already in `src/theme/variants.ts`. Do not add a private `switch`.

## Drawing inside an `svg`

The image surface renders this pack's React tree against this pack's stylesheet, so a primitive styles itself with Distillate handles and needs no second renderer. That holds everywhere **except inside an inline `<svg>`**, which is the one place the stylesheet does not reach.

An image backend does not lay out SVG children as part of the document. It lifts the element out, hands the markup to an SVG parser as a standalone sub-document, and composites the result — so a `<rect>` in there is no longer a node the stylesheet can match, and the document's custom properties are not in scope for it. A class that works perfectly in HTML paints nothing, and the shape rasterizes black.

So a shape inside an `<svg>` carries its own paint as a presentation attribute, beside the class it uses in the browser:

```tsx
<path d="…" fill="#00BFB3" />
```

Both surfaces read the one they can. A presentation attribute carries no specificity, so any class rule beats it and HTML stays scheme-aware through the custom property; the image has only the attribute, so that is what it draws. The one `<svg>` the pack draws is the Isomer mark (`src/render/logo.tsx`), which inlines `docs/logo.svg` as `ISOMER_LOGO_PATHS` with brand-fixed fills; `render/logo_marks.test.ts` keeps the paths in step with the file. Everything else — rails, arrows, brackets, spines — is a bordered block, so it follows the theme on both surfaces.

Two traps worth naming:

- **`var(--x, #fallback)` is worse than `#fallback`.** SVG parsers generally do not implement custom properties, and rather than taking the fallback they discard the whole declaration — so the shape ends up black, which is the failure the fallback looked like it was preventing. Write the literal.
- **The attribute cannot vary by scheme.** There is no stylesheet behind it, so it is one value for both. Treat a mark drawn this way as brand-fixed, the way the logo is, and keep scheme-varying color for everything outside the `<svg>`.

## Data-driven geometry

A length that comes from the node's data rather than the design — a bar's share of its track, a pin's position on a render — is set with an inline `style`. The cap or size it is computed against still lives in the theme (`bars.barMaxShare`, `annotatedRender.pin.size`), so the only literal in the renderer is the data.

## Inline marks

Text fields that accept `` `code` `` and `**strong**` render through `src/render/marks.tsx`: `marksReact` on the React surface, `stripMarks` for text and for fit estimates, `marksSlack` for Slack mrkdwn, and the authored string unchanged for Markdown. Strong is bold ink in regular-weight copy and primary in text that is already bold or display-sized (titles, taglines, statements, quotes, item titles, labels), where extra weight would not show. Say so in the field's `.describe()`, so a model knows the field takes them.

## Writing a leaf primitive

```tsx
import { catalog } from './catalog';
import { examples } from './examples';
import { schema } from './schema';
import { react } from './react';

export const slideHeadingPrimitive = definePrimitive({
  type: 'slideHeading',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text: ({ title, lede }) => [title.toUpperCase(), lede].filter(Boolean).join('\n'),
    markdown: ({ title, lede }) => [`## ${title}`, lede].filter(Boolean).join('\n\n'),
  },
});
```

Leave both type arguments inferred. Passing `TNode` alone widens the schema and drops field brands. The node type is `z.infer<typeof schema> & PrimitiveNode`, exported from `schema.ts`.

There is no `svg` renderer, and adding one is the mistake this pack exists to rule out. The image surface lays out the `react` tree against the pack's stylesheet, so a second hand-authored tree is a second thing to keep in sync and a second thing to get wrong. [Drawing inside an `svg`](#drawing-inside-an-svg) covers the one place that equivalence stops.

The `text`, `markdown`, and `slack` renderers live in `index.tsx`; no primitive has grown one into its own file.

Spread `nodeAnchor(context, { type })` from `@elastic/isomer-sdk` on the renderer's root element. It renders nothing unless an enhancement needs to find the node, and the conformance suite checks every primitive has one. Content that is not one of the node's `children`, such as an embedded slide, renders with `anchors: false`. An ordered primitive can also [build](builds.md).

## Children come from the schema field

A field filled from JSX children is branded on the schema. `fromChildren` and `fromTextChildren` are identity wrappers: `z.infer` is unchanged, and `buildJsxShim` reads the brand for the child component and for parsing. Describe the inner schema first — `.describe()` clones the schema and drops the brand.

```ts
turns: fromChildren(
  'slideTurn',
  z.array(turnSchema).min(1).max(8).describe('Turns in order. One to eight.'),
  { text: 'text' }
),
```

`slideJsx` then includes `SlideTurn`, typed from the array element. `text: 'text'` copies leftover text children onto that field. An explicit `turns` prop wins over children. Placing `<SlideTurn>` directly under `<Composition>` throws, because it is not a body node.

```tsx
<SlideTranscript>
  <SlideTurn role="user">Show me refunds.</SlideTurn>
  <SlideTurn role="model" format="code">{'{"type":"slideHeading"}'}</SlideTurn>
</SlideTranscript>
```

A string field uses `fromTextChildren` the same way, with `collapseWhitespace: false` when newlines matter. A prop holding a plain object may nest author elements anywhere inside it — `left={{ items: [<SlideCode … />] }}` — and the shim converts each one to its node.

Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Two primitives that brand the same child type with different item shapes throw `DUPLICATE_AUTHORED_CHILD` when the shim is built.

One branch: a primitive that declares `schemaFor` also hand-writes its node type. The body-node union is injected per composition, so it cannot appear in a static schema — which is why `schemaFor` exists — and `z.infer` cannot name that cycle (`TS2456`, `TS7022`). Brand the child field the same way. When one child element is not the array element, pass `toItem`; its props annotation is the child component's props. `slideFrame`, `slideSplit`, `slideStack`, `slideWindow`, and `slideTitle` are that branch. Every other primitive's schema is its only declaration.

## Writing a container primitive

Containers (frame, split, stack, window, title) need three more fields:

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

Give a container a `slack` renderer too, built on `renderSlackChildren`. Without one, the dispatcher sends the container's markdown to Block Kit, and every child goes with it, including a child that has a native `slack` renderer:

```ts
slack: (node, { collector, scope }) =>
  renderSlackChildren(node.items, scope, collector),
```

A container that also draws chrome of its own sets two more. `hasOwnContent: () => true` keeps it on a surface when every child is hidden there, and `metrics.svgHeight` reports its drawn height to a frame that sums node heights. `slideFrame` sets both because it owns the 16:9 canvas. `slideWindow` sets `hasOwnContent` for its title bar; it needs no `svgHeight` because the slide frame does not sum node heights. `slideSplit` and `slideStack` set neither, since they draw nothing and take their height from their children.

## Writing catalog copy

`catalog.ts` is what a model reads when it chooses a primitive, rendered into the authoring prompt beside the pack's guide and rules (`src/agent_guide.ts`). Write it for that reader:

- `purpose` states the reader's need the primitive meets ("Show how two parallel paths converge on one result"), not what it draws ("Render lanes").
- `useWhen` holds two or three author intents, each a situation rather than a shape.
- Every `avoidWhen` entry names the primitive to use instead, by `type` ("The steps have no order; use slideColumns."). A near neighbor that points back makes the choice between them explicit.
- `example` uses neutral subject matter. A model copies the example's register, so an example about Isomer produces slides about Isomer.
- Write a cross-field constraint as `.check(crossRefine(…))` or `.check(crossSuperRefine(…))` from `src/primitives/cross_field.ts`, not a bare `.refine`: Zod skips a bare one once any field fails, so an author would fix one error only to meet the next. It is invisible in the JSON Schema; restate it in `src/pack_authoring.ts`.

## Previewing a primitive

`src/examples/preview.test.ts` renders a primitive's examples to PNG, light and dark, beside a `.txt` of its text, Markdown, and Slack output. It is skipped unless asked for:

```sh
SLIDE_PREVIEW=slidePipeline SLIDE_PREVIEW_OUT=/tmp/preview pnpm vitest run packages/isomer-primitives-slides/src/examples/preview.test.ts
```

Each example is framed the way a deck would frame it, after a `slideHeading` on a page frame, or alone on an inverse frame for title, section, and closing primitives. `SLIDE_PREVIEW_FILE=compositions.json` renders a JSON array of whole compositions instead, for comparing a slide against a design.

## Tests

Each primitive's `index.test.ts` covers its schema rejections and every surface's output; `src/primitives/test_helpers.fixtures.ts` holds the `authoredStrings` and `slackText` helpers those tests share. The tests that rasterize (`src/examples/fit.test.ts`, `src/examples/preview.test.ts`, `src/examples/worked_example/index.test.ts`, `src/render/overflow.test.ts`) need `@elastic/isomer-image-takumi` and `@fontsource/*` as devDependencies. `src/builds/builds.test.ts` and `src/primitives/slide_command/copy.test.ts` run under `happy-dom` through a `// @vitest-environment happy-dom` pragma, so a pack lifted out of this monorepo installs `happy-dom` too.

## Registering the primitive

A new primitive has six stops, all hand-maintained:

1. Its folder, `src/primitives/<type>/`.
2. `src/registry.ts`: the import and its place in `slideDeckPrimitives`, alphabetically.
3. `src/body_node.ts`: its node type in the `BodyNode` union, in the same order.
4. `src/pack_authoring.ts`: its group in `slidePrimitiveGroups`, and a `describe` entry restating any cross-field rule.
5. `src/stylesheet.ts`: its Distillate module in `slideModules`.
6. `src/theme/theme.ts`: its theme group from `src/theme/components/<group>.ts` in `SLIDE_THEME`.

```ts
import { myNewPrimitive } from './primitives/my_new_type';

export const slideDeckPrimitives = [
  …,
  myNewPrimitive,
] as const;
```

The registry and the union cannot be collapsed into one — the container `types.ts` files import `SlideContentNode`, so deriving the union from the registry closes that cycle at the value level (`TS7022`). `src/registry.test.ts` guards the first four stops: a type-level assertion that the two lists agree in both directions, `assertPackRegistrationComplete`, which reads `src/primitives/` and fails when a directory is in neither list, and a check that every registered type is in exactly one group. Forgetting one fails the build with the lines to add.

## Authoring with JSX

`slideJsx` is the primitives as components, so a deck reads as markup instead of a hand-built node tree. It is `buildJsxShim(slideDeckPrimitives)` from `@elastic/isomer-sdk/author`, prebuilt in `src/jsx.ts`, with `src/jsx.test.ts` failing when the registry and the shim drift:

```tsx
import { slideJsx } from '@elastic/isomer-primitives-slides';

const { Composition, SlideFrame, SlideHeading, toComposition } = slideJsx;

const composition = toComposition(
  <Composition title="Refunds settle in two days">
    <SlideFrame brand="Ledger" sectionNumber="02" section="Settlement">
      <SlideHeading title="Refunds settle in two days, not five" />
    </SlideFrame>
  </Composition>
);
```

`toComposition` walks the tree back into the plain `Composition` value every surface renders from — JSX is authoring sugar, not a second representation. The Isomer deck (`examples/deck/src/slides/*.tsx` at the repository root) authors every slide this way; the pack's own worked example (`src/examples/worked_example/index.ts`) is the same kind of deck as plain object literals.

## React hosts

A host that wants to preview one primitive outside a full deck uses `StandaloneSlideNode`, which wraps a single content node in the deck-root scope and inlines the pack's stylesheet:

```tsx
import { StandaloneSlideNode } from '@elastic/isomer-primitives-slides';

<StandaloneSlideNode node={{ type: 'slideHeading', title: 'Preview' }} />;
```

`slideStylesheet()` returns the same CSS as a standalone string, for a host that mounts the pack's React tree itself and wants to inject the `<style>` tag separately rather than through `StandaloneSlideNode`.
