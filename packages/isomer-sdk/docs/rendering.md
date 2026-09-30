# Rendering

The SDK owns the output shapes: what a whole composition looks like as text, markdown, Slack blocks, and HTML. [Dispatch](dispatch.md) gets a single node to its renderer; this layer wraps the body in whatever the format calls an envelope.

## Envelopes

Three of the four are small, and each takes a narrow dispatcher interface rather than the whole thing — a text envelope needs `renderText` and nothing else.

```ts
renderTextEnvelope(composition, dispatcher, { heading }); // title uppercased, subtitle, nodes, blank-line joined
renderMarkdownEnvelope(composition, dispatcher, { heading }); // # title, _subtitle_, nodes
renderSlackEnvelope(composition, dispatcher, { heading, text, collectAssets, assetPrefix });
```

`heading: false` leaves out the title and subtitle, and nothing else; the Slack envelope also leaves them out of its default fallback `text`. It defaults to `true`.

The Slack envelope does the most. It emits a `header` block for the title and a `context` block for the subtitle unless `heading` is `false`, then each node's blocks; clamps every text field Slack limits; enforces Slack's 50-block message budget; clamps the fallback `text` to 4,000 characters; and returns only the asset requests whose placeholder block survived the budget — uploading files for elided blocks would be orphaned work.

`SLACK_LIMITS` publishes the numbers a renderer has to respect: 50 blocks per message, 3,000 characters in a section, 10 fields per section, 10 elements per context block, 25 buttons in an actions block, 150 characters in a header, 75 in an option label or button.

## HTML

`renderHTMLWithDispatcher(composition, { dispatcher, validate, options, styleAdapter, enhancementDefinitions, defaultAriaLabel })` returns:

```ts
interface HTMLRenderResult {
  html: string;
  css: string;
  js: string;
  body: string;
  measurement: PayloadMeasurement;
  validationErrors: ValidationError[];
}
```

`html` is the wrapper element plus content; `body` is the content alone; `css` is what the adapter emitted; `js` is the enhancement script as a function body over `root` (see [Enhancements](#enhancements)); `measurement` is the byte length of the markup, the stylesheet, the enhancement script as delivered, and their total, for a host that budgets payload size. Validation runs inside, per the caller's `onValidationError` mode, and the findings come back on the result as `validationErrors` (`{ path, message, nodeType?, code? }` each) rather than being thrown by default; input refused by [the budget](composition.md#the-input-budget) throws in either mode.

`validate` defaults to `createCompositionValidator(dispatcher.definitions)`; pass one when validation needs options or a wider inventory.

React content is shared with the React surface through one helper, so the two cannot diverge: an `h2` and a `p.sub` for the composition's title and subtitle when `heading` is not `false`, then the body nodes, inside a dispatcher context provider.

The wrapper differs in one place. `html` renders the body to a string first and hosts it in a `div`, so the document is `section.isomer > div > body`, with the optional `style` and `script` elements beside the `div`; the React surface's `wrapCompositionContent` places the content directly inside the `section`. Style `.isomer` descendants (`.isomer h2`, `.isomer .card`) rather than `.isomer >` children, and the same rules serve both surfaces.

## Style adapters

CSS is not the SDK's. A pack supplies an `HTMLStyleAdapter`, and the SDK calls it at fixed points in the pass:

| Hook                    | When                                                                        |
| ----------------------- | --------------------------------------------------------------------------- |
| `resolveOptions?`       | First — settles composition-dependent options, before anything reads them   |
| `createCollector`       | Once per render                                                             |
| `collectWrapperStyles?` | The `.isomer` / `.isomer.framed` / `.isomer.fluid` rules around the wrapper |
| `collectViewStyles?`    | Per composition, with the dispatcher and the enhancement scope              |
| `createRenderContext`   | Builds the context every `react` renderer is handed                         |
| `collectAfterRender?`   | After the tree is rendered                                                  |
| `renderStyles`          | Emits the stylesheet                                                        |
| `getScriptText?`        | Emits the adapter's own script, a function body over `root`                 |

`createRenderContext` must return a complete context, because `TContext` is the pack's own type. The HTML surface never writes to it and hands renderers a view of it rather than a copy, so a frozen or class-instance context keeps its methods and private state. Whether renderers emit [node anchors](#node-anchors) during an HTML render is the surface's decision, whatever the context's `anchors` says. The HTML adapter's default `TContext` is `StyledRenderContext` (`resolveClassName`, `cssVarRef`). `PrimitiveRenderContext` itself is `enhancements`, `anchors`, and `onEvent`.

A pack that authors its CSS with [Distillate](https://elastic.github.io/distillate/), Elastic's typed CSS engine with render-driven style collection, does not write those hooks by hand. `createDistillateHtmlStyleAdapter(distillery)` is the adapter: record handles during render, emit their stylesheet. Put it on `definePrimitivePack({ styleAdapter })` so a host gets it without asking. The SDK does not depend on Distillate; the helper is duck-typed against `artifactCollector`, `renderStyles`, and `registry`.

`ownsHandle` is what lets a runtime combine several packs' adapters instead of making the host choose one: each handle goes to the adapter that owns it, so no pack's CSS is emitted twice or rendered against another pack's theme. Declare it on any adapter meant to coexist with others. The Distillate helper answers it from the distillery's own registry.

A primitive contributes CSS through `collectStyles(node, { styles, context })`. The adapter's `collectViewStyles` still walks the body via the dispatcher's positional `collectStyles(node, styles, context)`.

The wrapper hook is named for the wrapper rather than the SVG frame. The document an image is drawn inside is a [Frame](frame.md).

## Enhancements

A progressive enhancement is an id, a content gate, and usually a script. `resolveEnhancements(body, requested, walk, definitions)` intersects what the host asked for with what the composition actually contains, so a composition with no table never ships the sort script. The host opts in by id: `enhancements: ['tableSort']`. The HTML render resolves the request once for every pack: the set reaches every renderer as `context.enhancements`, in place of anything the adapter's context holds, and each resolved enhancement's script is emitted once. A set rather than a field per feature, so adding one costs no plumbing:

```ts
context.enhancements?.has('tableSort');
```

The baseline — empty or absent — has to answer the question on its own. An enhancement improves an answer that already works without it.

### Who runs the script

Every script, whether an enhancement's, the adapter's `getScriptText`, or the caller's `scriptText`, is a function body with `root`, the render's `.isomer` section, in scope. The `scripts` option decides who binds `root` and runs it:

| `scripts`              | `html` carries                                                               | The host                                                                |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `'embedded'` (default) | A `<script>` that binds `root` to its parent section when the page parses it | Does nothing                                                            |
| `'host'`               | No `<script>`                                                                | Calls `runEnhancementScript(result.js, section)` after inserting `html` |

`'embedded'` only works where the browser parses the HTML with the page. It never runs inside a shadow root or anywhere the host inserts `html` itself: `innerHTML` and React never execute a `<script>`, and one that a loader did execute would find `document.currentScript` `null` in a shadow tree. Those hosts use `'host'`. `result.js` is the same body in both modes and runs only through `runEnhancementScript`, never as a `<script>` of its own.

The mismatches that can be detected are reported. An embedded script that runs without a root warns. `runEnhancementScript` throws `ENHANCEMENT_ROOT_MISSING` when it is given no section, and warns when the section also carries an embedded script, which in light DOM would run every enhancement twice. An embedded script inserted with `innerHTML` never runs at all, so nothing can report it.

`runEnhancementScript` compiles with `new Function`, so a strict Content-Security-Policy must allow `'unsafe-eval'`. A host that cannot should render with `'embedded'` into light DOM.

An enhancement the host drives itself, rather than one that ships behavior in the page, has no `script`.

## Node anchors

Runtime code that acts on a rendered node, such as a host stepping through a slide's parts, finds its element through a node anchor. A `react` renderer spreads `nodeAnchor(context, node)` on its root element, which sets `data-isomer-node` to the node's type, escaped so HTML parsing leaves it unchanged (`anchorValue(type)`; a plain identifier is unchanged):

```tsx
react: (node, { context }) => <ol {...nodeAnchor(context, node)}>…</ol>,
```

Anchors render only when something needs them, so a render nobody acts on carries none. During an HTML render the surface decides, for the whole synchronous render and without touching the render context: anchors are on when a resolved enhancement declares `anchors: true`, or when a test passes the `anchors: true` render option, and off otherwise, whatever the context's `anchors` says. `anchors: false` cannot turn off anchors an enhancement needs. Outside an HTML render, on the React and `svg` surfaces, the context's own `anchors` decides: a React host turns them on with `withNodeAnchors(context)` or `anchors: true` on the context it passes, or by passing the runtime's React surface an enhancement that declares `anchors: true`; the runtime's `svg` surface takes an `anchors: true` render option.

`findNodeElementPairs(root, composition.body, walk)` lists each `react`-visible node, pre-order, with its element, so a node object used twice pairs twice; `findNodeElements` is the same as a map from node to element. Either way the k-th node of a type, walked pre-order, is the k-th element anchored with that type in document order. `root` holds one render. A type whose counts disagree, for instance because one of its nodes rendered nothing, is left out, so the caller falls back to its baseline. For the pairing to hold, a container draws its `children` in the order its definition returns them, and anything a renderer draws that is not one of its `children` renders with `withoutAnchors(context)`. It returns a view of the context, not a copy, so methods, getters, private state, and `instanceof` keep working; anchors are off for that subtree, and the mark survives contexts derived from it by spreading.

## Checking a layout

`checkLayout(layout, composition.body, walk, surface)` reports where nodes run past the room their container gives them or land on each other, from a measured render with anchors on. `layout` is a `LayoutBox` tree: canvas `x`, `y`, `width`, and `height`, an optional `scale`, text `runs`, `attributes`, and `children`. It is declared by shape, so the takumi backend's `measure` produces one, and `measureDom(root)` produces one from a browser's DOM: each element's `getBoundingClientRect` measured from `root`'s top left, its text runs' client rects, and its attributes other than `class`, `id`, and `style`. An HTML element's `scale` is its drawn size over its layout size, so a rotated one reads as scaled and nothing inside it is checked. An SVG element has no layout size, so it is never scaled and the inside of a transformed SVG subtree is still checked. `measureDom` needs a real layout engine; under jsdom every box is empty. Boxes pair with nodes by the same rule as `findNodeElementPairs`. `surface` is the one the layout was rendered on, `svg` for an image or `react` for the DOM, which decides the top-level nodes it drew; nested nodes follow `react` either way.

Each `LayoutFinding` is `{ kind, path, type, with?, by }`, with `path` in validation's form. The rules know nothing about any pack:

- A node's room is the box of its nearest anchored ancestor, or of an element inside it that spreads `layoutRoom(context)`, such as a frame's body, or the whole canvas at the top level. `layoutRoom` sets `data-isomer-room` (`LAYOUT_ROOM_ATTRIBUTE`) whenever `nodeAnchor` would render; it bounds the nodes nested in it, not its own node's content. An anchored box whose type is left out still counts as a room and bounds its parent's content. `overflow` is its element boxes past that room; its text runs are left out, because glyphs overhang a tight line height.
- `overlap` is text or childless boxes shared by two siblings under the same room, `by` the shortest distance along one axis that would clear them, which for one inside the other is more than their shared width. A node is never compared with the nodes nested in it.
- A scaled box is one opaque box, and nothing inside it is checked. One pixel of spill is tolerated.

Findings are advice, not validation errors, and no surface runs the check: an overlap may be intended, and the agent or author reading them decides. `overflow: hidden` is not visible to it, and a container's inner region is only a room when the renderer marks it with `layoutRoom`. A pack whose renderers spread no anchors gets no findings, and a type whose counts disagree is not reported, as with `findNodeElementPairs`. Findings belong to the engine that measured the layout: the same composition can fit in a browser and overflow in takumi.

## How Slack output is fitted

`renderSlackEnvelope` always returns a postable payload, fitting the rendered blocks to Slack's limits (`SLACK_LIMITS`) in a fixed order:

1. **Text clamping.** Every block a renderer returns has each Slack-limited text cut to its `SLACK_LIMITS` entry, keeping the leading text, cut at a grapheme boundary, and ending in `…`: header, section text and fields, context elements, image and video titles, video description and `author_name`, image alt text, button text, select placeholders, and option and option-group labels. An `initial_option` is clamped the same way as the options it has to match. Rich-text and table cell text is left alone.
2. **Table limits.** Slack counts table cell characters across the whole message, not per block, so tables that individually fit can still push the message over. In document order, a table is kept if it has between one and `tableRows` rows, each with between one and `tableColumns` cells, and its cells fit what the tables kept before it left of `tableCellCharsPerMessage`; any other is replaced by one `rich_text` block, and no cell is clamped. Each row prints its columns, to the wider of the header and the row, as `heading: cell`, the heading bold with its own styles, and a blank section parts the rows. A cell keeps its inlines, styles, sections, lists, quotes, and preformatted blocks as separate elements, and a list keeps its items as the cell gave them; a blank heading leaves its cell alone, a heading that is not one section prints its blocks, bold, above the cell. A table whose rows past the header have no cells prints its headings, and one with nothing to print, such as a table with no rows, is dropped. An empty row, or an empty element in a cell, prints nothing. A section ends its line before the next one unless its rendered text already ends in a line terminator. A section, quote, or preformatted element past `sectionTextChars` splits into adjacent elements of its type with nothing added between them. A link or tag within that length stays whole; anything longer splits at grapheme boundaries (a grapheme past the length at code points) into inlines of its own type and style, so a long link becomes adjacent links to the same URL whose labels, or the URL where it has none, run on, and a long tag adjacent tags of its color.
3. **Section rhythm.** A divider goes in front of every header and the actions block; a spacer follows each content block except a table about to be followed by a divider. Consecutive field-only sections are not spaced, since they read as one grid.
4. **Block budget.** If the block count still exceeds `blocksPerMessage`, spacers are dropped first, from the end backward, since they cost nothing but rhythm. If that alone is not enough, the remainder is truncated and replaced with a trailing context block noting how many were elided.

`assets` is filtered to the requests whose placeholder block survived step 4 — a block `enforceBlockBudget` elides is never posted, so uploading its file would be wasted, orphaned work.

## Formatting helpers

`./markdown` publishes the `md` builder, `serializeMarkdown`, `boldLabelPrefix`, and `boldSectionLabel` (with builder forms on `md`), all printed through one GFM serializer that escapes each value where it lands; `./slack` the escaping, clamping, and Block Kit constructors. `formatCompactNumber` and the structured-value formatters live on the root entry, since every surface needs them. `./text` publishes no formatters: line width, trend glyphs, and threshold copy are editorial choices a pack makes, not contract.

## Next

[Dispatch](dispatch.md) · [Frame](frame.md)
