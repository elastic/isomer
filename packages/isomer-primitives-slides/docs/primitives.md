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
| `fit.ts` | Only for a length-sensitive primitive: the estimate that picks its size step ([Size steps](theme.md#size-steps)). |

A primitive holds no values of its own. Everything it renders lives in its group under `SLIDE_THEME` (`src/theme/components/<group>.ts`, assembled by `src/theme/theme.ts`), which its `styles.ts` reads.

Each primitive's `catalog.ts` and `examples.ts` ship in `dist` beside its renderers, because the authoring prompt and the conformance harness read them from the built package. What `tsconfig.build.json` excludes is `src/examples/**`: the worked deck and its snapshot output, which are type-checked but never published.

## Before you add a value: one source per rendered value

Every length on the spacing, type, or radius scale and every scheme-varying color has exactly one authoring source, and that source is always `SLIDE_THEME`. The scales live in `src/theme/base.ts`: spacing from `space` (keyed by pixel value on the fixed canvas, `space.px48`), type from the `type` roles or `font.size` / `font.weight` / `font.tracking` / `font.lineHeight`, corners from `radius`, strokes from `stroke`, and scheme-varying color from `color` and `inverse`. Each primitive then has its own group in `src/theme/components/` that composes those into the values its module reads. A raw `px(...)` belongs there only when the value genuinely has no place on a scale, and it says why. Do not type a literal into a `styles.ts` or a renderer that the theme could name — `bulletList.crossGlyph` is a theme value because a marker is a value, not a decoration.

A glyph more than one primitive prints lives once, in the shared `glyph` group (`src/theme/components/shared.ts`): `arrow`, `separator`, and `dash`. A component group points at it (`code.traceArrow` and `split.arrowGlyph` are both `glyph.arrow`, `frame.separator` is `glyph.separator`) rather than typing the character again.

This does not reach every literal in a module: `1fr`, `minmax(0, …)`, `50%`, and a fixed `repeat(2, …)` are CSS mechanics rather than design tokens, and stay inline.

[Distillate](https://elastic.github.io/distillate/) theme leaves are not color-only: a plain `string` becomes a CSS custom property with identical light/dark values; `lightDark(light, dark)` is the scheme-varying color helper; a `ScaleToken` (`cq` / `scaleToken`, wrapped here as `px` and `literal`) inlines as a literal and cannot vary across schemes or overlays. This pack uses `ScaleToken` for everything outside `color` and `inverse` because the 16:9 canvas is fixed — a host that wants different geometry replaces the frame (`docs/document.md`, `docs/theme.md`), not a token. Reach for a string leaf only when a value is meant to be host-themeable.

A CSS module that branches on an enum field uses `variants(domain, factory)` with the domain array already in `src/theme/variants.ts`. Do not add a private `switch`.

## Drawing inside an `svg`

The image surface renders this pack's React tree against this pack's stylesheet, so a primitive styles itself with Distillate handles and needs no second renderer. That holds everywhere **except inside an inline `<svg>`**, which is the one place the stylesheet does not reach.

An image backend does not lay out SVG children as part of the document. It lifts the element out, hands the markup to an SVG parser as a standalone sub-document, and composites the result — so a `<rect>` in there is no longer a node the stylesheet can match, and the document's custom properties are not in scope for it. A class that works perfectly in HTML paints nothing, and the shape rasterizes black.

So a shape inside an `<svg>` carries its own paint as a presentation attribute, beside the class it uses in the browser:

```tsx
<path d="…" fill="#00BFB3" />
```

Both surfaces read the one they can. A presentation attribute carries no specificity, so any class rule beats it and HTML stays scheme-aware through the custom property; the image has only the attribute, so that is what it draws. The one `<svg>` the pack draws is the Isomer mark (`src/render/logo.tsx`), which inlines `docs/logo.svg` as `ISOMER_LOGO_PATHS` with brand-fixed fills; `render/logo_marks.test.ts` keeps the paths in step with the file. Everything else — rails, arrows, rules, check marks — is a bordered block, so it follows the theme on both surfaces.

Two traps worth naming:

- **`var(--x, #fallback)` is worse than `#fallback`.** SVG parsers generally do not implement custom properties, and rather than taking the fallback they discard the whole declaration — so the shape ends up black, which is the failure the fallback looked like it was preventing. Write the literal.
- **The attribute cannot vary by scheme.** There is no stylesheet behind it, so it is one value for both. Treat a mark drawn this way as brand-fixed, the way the logo is, and keep scheme-varying color for everything outside the `<svg>`.

## Inline marks

Text fields that accept `` `code` `` and `**strong**` render through `src/render/marks.tsx`: `marksReact` on the React surface, `plainText` for text, `stripMarks` for fit estimates, `marksMarkdown` for the Markdown builder, and `marksSlack` or `marksRichText` for Slack. Strong is bold ink in regular-weight copy and underlined primary in text that is already bold or display-sized (headings, taglines), where extra weight would not show, so it is never color alone. Say so in the field's `.describe()`, so a model knows the field takes them; `src/marks_descriptions.test.ts` fails when the two disagree.

## Writing a leaf primitive

```tsx
import { md } from '@elastic/isomer-sdk/markdown';

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
    text: ({ title, lede }) =>
      [plainText(title).toUpperCase(), lede && plainText(lede)].filter(Boolean).join('\n'),
    markdown: ({ title, lede }) => [
      md.heading(1, ...marksMarkdown(title)),
      ...(lede ? [md.paragraph(...marksMarkdown(lede))] : []),
    ],
    slack,
  },
});
```

Leave both type arguments inferred. Passing `TNode` alone widens the schema and drops field brands. The node type is `z.infer<typeof schema> & PrimitiveNode`, exported from `schema.ts`.

An authored string is `lineText()` or `wrappedText()` from `src/primitives/authored_text.ts`, never a bare `z.string()`. Both cap its length at `authoredTextMaxLength` (10,000 characters), an input-size guard against far too much text rather than a layout limit, so validation refuses it before any renderer parses marks or estimates a size. Whether text fits is the layout check's job, not the schema's.

There is no `svg` renderer, and adding one is the mistake this pack exists to rule out. The image surface lays out the `react` tree against the pack's stylesheet, so a second hand-authored tree is a second thing to keep in sync and a second thing to get wrong. [Drawing inside an `svg`](#drawing-inside-an-svg) covers the one place that equivalence stops.

The `text`, `markdown`, and `slack` renderers live in `index.tsx`. A `markdown` renderer returns the SDK's `md` builder content, never a string, so the serializer escapes each value where it lands. A one-line authored value goes through the SDK's `oneLine` on the text and Slack surfaces; `src/content_parity.test.ts` fails when a line break survives on any of them. Every primitive has a `slack` renderer, and `src/registry.test.ts` fails when one does not.

Slack clamps `header`, `section`, field, and `context` text well below `authoredTextMaxLength`, and leaves `rich_text` whole. Build those blocks through `src/render/slack_text.ts` (`slackHeading`, `slackSection`, `slackContext`, `slackFields`, `slackMarksSection`, `slackMarksContext`), which keep the block when it holds the whole text and fall back to rich text when it does not; `src/slack_limits.test.ts` checks each such slot at its limit and one past it. Bold a `mrkdwn` label with `slackBold`, which keeps edge whitespace outside the asterisks, and link rich text with `richTextLinked`, which links only what `slackLinkUrl` accepts.

`mrkdwn` has no escape for `*`, `_`, `~`, or a backtick, and Slack reads `<` and `&amp;`-style escapes even inside code, so authored text that holds them goes to Slack as literal rich text instead. `slackSection`, `slackContext`, and `slackFields` take the authored text their `mrkdwn` carries as a required last argument, each a `MrkdwnSource`: a plain string, `{ marks }` for a field whose `code` and `**strong**` marks `marksSlack` draws, or `{ code }` for code in a code block. When `mrkdwnKeeps(sources)` says Slack would not print one as written, they return the fallback, which must hold the same text as literal rich-text runs. Pass `[]` only for text the pack writes itself. `slackMarksSection`, `slackMarksContext`, and `slackCaption` pass their own. Send code through `slackCodePanel(source, caption?, strong?)`, which falls back to `rich_text_preformatted` when the source holds a backtick fence, a `<`, or an `&amp;`, `&lt;`, or `&gt;`. `src/content_parity.test.ts` reads every Slack block back the way Slack does and fails when a field that holds any of these, added to any example, does not come back as authored.

Spread `nodeAnchor(context, { type })` from `@elastic/isomer-sdk` on the renderer's root element. It renders nothing unless a host asks for anchors, and it is what `checkLayout` pairs measured boxes to nodes by. `slideFrame` also spreads `layoutRoom(context)` on its body, so `checkLayout` measures the body's nodes against the body rather than the whole canvas.

A primitive that picks its own size reads the room it has with `slideLayout(context)` from `src/primitives/layout.ts`: `width` and `height` in pixels, and `crowding`. A container gives its children theirs with `withLayout(context, { width, height })`, after taking out what it draws around them; [Size steps](theme.md#size-steps) lists who sets and reads it.

## Measuring text as it is styled

Measure text with `measureText(text, role, width?)` from `src/primitives/size.ts`, which returns `{ lines, widest }` in pixels. `role` is the same type role the primitive's `styles.ts` hands `typeRole()`, at the step being tried (`{ ...agenda.title, size: agenda.titleSizes[step] }`), so the estimate and the stylesheet read one value. A role's `transform` (`font.transform.uppercase`) and `whiteSpace` (`font.whiteSpace.nowrap`) are what `typeRole()` emits as `text-transform` and `white-space`; set them on the role, not as a literal in the module, and the measure follows. Its `family` and `weight` pick the advances: mono and regular by column, semibold and heavier by Inter ExtraBold's glyph classes. Whitespace runs and line terminators collapse to one space, as CSS and takumi collapse them; a no-break space stays a glyph. A word wider than its line breaks between glyphs, as `overflow-wrap: anywhere` does on the deck root, one glyph a line at least, so a zero width counts one line a glyph. Strip marks before measuring. `lineBox(role)` is one line's height.

`wrappedLines`, `proseLines`, and `monoLines` are `measureText` for ExtraBold, Regular, and mono at a pixel size, never under one line; `textColumns` counts columns after whitespace collapses, and `rowLoad` sums it. `sizeForLines` breaks no word, so its words pack whole. `slideCode` compares `displayColumns` against its column cap directly: its lines are `white-space: pre`, and its schema refuses line terminators and tabs. `src/primitives/size.test.ts` checks the uppercase, `nowrap`, per-step, whitespace, long-word, and zero-width cases, and spot-checks `measureText` against takumi.

## Children come from the schema field

A field filled from JSX children is branded on the schema. `fromChildren` and `fromTextChildren` are identity wrappers: `z.infer` is unchanged, and `buildJsxShim` reads the brand for the child component and for parsing. Describe the inner schema first — `.describe()` clones the schema and drops the brand.

```ts
items: fromChildren(
  'slideTerritory',
  z.array(territorySchema).min(1).max(4).describe('Owners, left to right, in equal columns. 1 to 4.'),
  { text: 'body' }
),
```

`slideJsx` then includes `SlideTerritory`, typed from the array element. `text: 'body'` copies leftover text children onto that field. An explicit `items` prop wins over children. Placing `<SlideTerritory>` directly under `<Composition>` throws, because it is not a body node.

A string field uses `fromTextChildren` the same way, with `collapseWhitespace: false` when newlines matter.

Required text that is missing throws `IsomerError` with code `MISSING_AUTHORED_TEXT`. Two primitives that brand the same child type with different item shapes throw `DUPLICATE_AUTHORED_CHILD` when the shim is built. Two types that capitalize to the same component name, such as `slideStat` and `SlideStat`, or a type named `composition`, throw `DUPLICATE_PRIMITIVE_TYPE`.

One branch: a primitive that declares `schemaFor` also hand-writes its node type. The body-node union is injected per composition, so it cannot appear in a static schema — which is why `schemaFor` exists — and `z.infer` cannot name that cycle (`TS2456`, `TS7022`). `slideFrame`, `slideSplit`, `slideStack`, and `slideTitle` are that branch. Every other primitive's schema is its only declaration.

Nested nodes arrive as JSX children, never as an element inside a prop object. A container with one node slot fills it from its own children: `<SlideStack>…nodes…</SlideStack>` fills `items`. A container with several slots, or with props per slot, brands one field of sub-elements, and each sub-element's children are its nodes. `slideSplit` is that case: `panes` is `fromChildren('slideSplitPane', …, { toItem })`, and `toItem` fills each pane's `items` through `parseChildren`, left then right by index. `toItem` receives `children` among the props and strips it. Brand the standalone `schema`, not `schemaFor`, and pass both type arguments to `definePrimitive` (`definePrimitive<SlideSplitNode, typeof schema>`) so the brand reaches `slideJsx`.

```tsx
<SlideSplit divider="arrow">
  <SlideSplitPane label="Before">
    <SlideCode panels={[{ lines: ['curl …'] }]} />
  </SlideSplitPane>
  <SlideSplitPane label="After" tone="primary">
    <SlideBulletList items={['One call']} />
  </SlideSplitPane>
</SlideSplit>
```

A single-node prop such as `slideTitle`'s `aside` takes an element as the whole prop value: `aside={<SlideBulletList … />}`.

## Writing a container primitive

Containers (frame, split, stack, title) need three more fields:

```ts
schemaFor: (bodyNodeSchema) =>
  schema.extend({ items: bodyNodes(bodyNodeSchema, schema.shape.items) }),
children: (node) =>
  node.items.map((child, index) => ({ node: child, path: `items[${index}]` })),
renderers: {
  react,
  text: (node, { scope }) => renderTextChildren(node.items, scope),
  markdown: (node, { scope }) => renderMarkdownChildren(node.items, scope),
  slack: (node, { collector, scope }) =>
    renderSlackChildren(node.items, scope, collector),
},
```

- `schemaFor` replaces `unresolvedBodyNodeSchema` in the child slot with the runtime's full discriminated union so foreign nodes validate correctly. `bodyNodes` (`src/primitives/define.ts`) builds that slot from `contentNode`, which refuses a nested `slideFrame`, and carries over the field's `.describe()`, which `.extend()` would otherwise drop.
- `children` exposes nested nodes to the duplicate-id checker, the empty-surface checker, and node anchors.
- `src/render/children.ts` dispatches each child through the render scope, so a foreign node inside a container renders rather than disappearing. `renderMarkdownChildren` embeds each child's builder content through `scope.renderMarkdownContent`. Without a container `slack` renderer, the dispatcher sends the container's Markdown to Block Kit and every child goes with it, including one that has a native `slack` renderer.

A container that also draws chrome of its own sets two more. `hasOwnContent: () => true` keeps it on a surface when every child is hidden there, and `metrics.svgHeight` reports its drawn height to a frame that sums node heights. `slideFrame` sets both because it owns the 16:9 canvas. `slideSplit` has its own content only when a pane has a label or the split has a footnote; `slideStack` draws nothing and sets neither.

## Writing catalog copy

`catalog.ts` is what a model reads when it chooses a primitive, rendered into the authoring prompt beside the pack's guide and rules (`src/agent_guide.ts`). Write it for that reader:

- `purpose` states the reader's need the primitive meets, not what it draws.
- `useWhen` holds two or three author intents, each a situation rather than a shape.
- Every `avoidWhen` entry names the primitive to use instead, by `type` ("The points split by who owns them; use slideTerritoryGroup."). Name only registered primitives: `src/agent_guide.test.ts` fails when the prompt, schema descriptions and examples included, names a type the pack does not register.
- `example` uses neutral subject matter. A model copies the example's register, so an example about Isomer produces slides about Isomer.
- Write a cross-field constraint as `.check(crossRefine(…))` from `src/primitives/cross_field.ts`, not a bare `.refine`: Zod skips a bare one once any field fails, so an author would fix one error only to meet the next. Because it runs after a size bound fails, have it pass without reading a field whose count or length is already over its cap. A check that adds its own issues is `crossSuperRefine(refine, rules)`, and a rule on one field alone is `statedRefine`.
- `z.toJSONSchema` drops every refinement, so each of these takes a `rule` (`rules` for `crossSuperRefine`): the sentence, word for word, that a description the authoring schema keeps states it in, on the field it constrains or in the primitive's `describe` entry in `src/pack_authoring.ts`. A shared rule is a constant both use, as `hrefRule` is for `boundedHref()`. `src/stated_rules.test.ts` walks every primitive's schema, fails on a custom check made any other way, and fails when a rule is missing from that primitive's authoring schema.

## Tests

Each primitive's `index.test.ts` covers its schema rejections and every surface's output. These pack-level tests run over the whole registry, so a new primitive is covered by registering it:

- `src/content_parity.test.ts` checks that text, Markdown, Slack, and HTML carry every authored string of every example, reading Markdown back through `mdast-util-from-markdown` with GFM and Slack mrkdwn back to its text; that entity-like text such as `&lt;` and unpaired `` ` `` or `*` print as authored, one field at a time; and that a line break in a one-line field reads as a space on each surface.
- `src/slack_limits.test.ts` renders each Slack slot whose limit is below its schema cap at the limit and one past it, and expects the authored text whole both times.
- `src/examples/fit.test.ts` renders every example on a slide (a frame as it is; a title, section, or closing slide alone on an inverse frame; a statement or quote alone on a page frame; anything else under a heading and lede on a page frame), measures it with takumi, and expects no finding from `checkLayout`, which measures the body's nodes against the frame's body; the fullest `slideAgenda` and `slideDefinitions` examples are measured again below a two-line heading and lede, the room their load budgets are set against. Give each primitive an example at the most items, lines, or panels its schema takes, in representative copy. That proves the most structure fits, not every schema-valid string: a string may hold far more than a slide draws, which `checkLayout` reports. The same file measures statement, quote, agenda, and definitions at the most each holds at `l` and `m` on a slide with no heading, and keeps a fanout, a list, an agenda, the fullest roadmap, and the eight-entry tree that run past the body below the tallest heading, so a regression in that report fails. Each `slideGraph`, `slideRoadmap`, and `slideTimeline` example is also measured alone, under the tallest heading, as a title aside, and in a labelled split pane with and without a heading above it, where the step it picks must fit wherever `s` does.
- `src/conformance.test.ts` runs the SDK's conformance harness.
- `src/primitives/authored_text.test.ts` checks that `lineText()` and `wrappedText()` take exactly `authoredTextMaxLength` and refuse one more, and that every string in every example refuses one more.
- `src/heading_levels.test.ts` fails when an example's HTML headings and Markdown headings differ in level or order.
- `src/stated_rules.test.ts` fails when a custom check does not go through `src/primitives/cross_field.ts` or its rule is not in the primitive's authoring schema.

The tests that rasterize need `@elastic/isomer-image-takumi` and `@fontsource/*` as devDependencies.

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

The registry and the union cannot be collapsed into one — the container `types.ts` files import `SlideContentNode`, so deriving the union from the registry closes that cycle at the value level (`TS7022`). `src/registry.test.ts` guards the first four stops: a type-level assertion that the two lists agree in both directions, `assertPackRegistrationComplete`, which reads `src/primitives/` and fails when a directory is in neither list, a check that every registered type is in exactly one group, and a check that every primitive has a `slack` renderer. Forgetting one fails the build with the lines to add.

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

`toComposition` walks the tree back into the plain `Composition` value every surface renders from — JSX is authoring sugar, not a second representation.

## React hosts

A host that wants to preview one primitive outside a full deck uses `StandaloneSlideNode`, which wraps a single content node in the deck-root scope and inlines the pack's stylesheet:

```tsx
import { StandaloneSlideNode } from '@elastic/isomer-primitives-slides';

<StandaloneSlideNode node={{ type: 'slideHeading', title: 'Preview' }} />;
```

`slideStylesheet()` returns the same CSS as a standalone string, for a host that mounts the pack's React tree itself and wants to inject the `<style>` tag separately rather than through `StandaloneSlideNode`.
