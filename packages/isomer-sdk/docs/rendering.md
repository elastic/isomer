# Rendering

The SDK owns the output shapes: what a whole composition looks like as text, markdown, Slack blocks, and HTML. [Dispatch](dispatch.md) gets a single node to its renderer; this layer wraps the body in whatever the format calls an envelope.

## Envelopes

Three of the four are small, and each takes a narrow dispatcher interface rather than the whole thing — a text envelope needs `renderText` and nothing else.

```ts
renderTextEnvelope(composition, dispatcher); // title uppercased, subtitle, nodes, blank-line joined
renderMarkdownEnvelope(composition, dispatcher); // # title, _subtitle_, nodes
renderSlackEnvelope(composition, dispatcher, { text, collectAssets, assetPrefix });
```

The Slack envelope does the most. It emits a `header` block for the title and a `context` block for the subtitle, then each node's blocks; enforces Slack's 50-block message budget; clamps the fallback `text` to 4,000 characters; and returns only the asset requests whose placeholder block survived the budget — uploading files for elided blocks would be orphaned work.

`SLACK_LIMITS` publishes the numbers a renderer has to respect: 50 blocks per message, 3,000 characters in a section, 10 fields per section, 10 elements per context block, 25 buttons in an actions block, 150 characters in a header, 75 in an option label.

## HTML

`renderHTMLWithDispatcher(composition, { dispatcher, validate, options, styleAdapter, enhancementDefinitions, defaultAriaLabel })` returns:

```ts
interface HTMLRenderResult {
  html: string;
  css: string;
  body: string;
  measurement: PayloadMeasurement;
  validationErrors: ValidationError[];
}
```

`html` is the wrapper element plus content; `body` is the content alone; `css` is what the adapter emitted; `measurement` is the byte length of the markup, the stylesheet, the enhancement script, and their total, for a host that budgets payload size. Validation runs inside, per the caller's `onValidationError` mode, and the findings come back on the result as `validationErrors` (`{ path, message }` each) rather than being thrown by default.

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
| `getScriptText?`        | Emits the progressive-enhancement script                                    |

`createRenderContext` must return a complete context: the SDK does not fill fields in, because `TContext` is the pack's own type. The HTML adapter's default `TContext` is `StyledRenderContext` (`resolveClassName`, `cssVarRef`). `PrimitiveRenderContext` itself is only `enhancements` and `onEvent`.

A pack that authors its CSS with [Distillate](https://elastic.github.io/distillate/), Elastic's typed CSS engine with render-driven style collection, does not write those hooks by hand. `createDistillateHtmlStyleAdapter(distillery)` is the adapter: record handles during render, emit their stylesheet. Put it on `definePrimitivePack({ styleAdapter })` so a host gets it without asking. The SDK does not depend on Distillate; the helper is duck-typed against `artifactCollector`, `renderStyles`, and `registry`.

`ownsHandle` is what lets a runtime combine several packs' adapters instead of making the host choose one: each handle goes to the adapter that owns it, so no pack's CSS is emitted twice or rendered against another pack's theme. Declare it on any adapter meant to coexist with others. The Distillate helper answers it from the distillery's own registry.

A primitive contributes CSS through `collectStyles(node, { styles, context })`. The adapter's `collectViewStyles` still walks the body via the dispatcher's positional `collectStyles(node, styles, context)`.

The wrapper hook is named for the wrapper rather than the SVG frame. The document an image is drawn inside is a [Frame](frame.md).

## Enhancements

A progressive enhancement is an id, a content gate, and a script. `resolveEnhancements(body, requested, walk, definitions)` intersects what the host asked for with what the composition actually contains, so a composition with no table never ships the sort script. The host opts in by id: `enhancements: ['tableSort']`. The resolved set reaches renderers as `context.enhancements`, a set rather than a field per feature, so adding one costs no plumbing:

```ts
context.enhancements?.has('tableSort');
```

The baseline — empty or absent — has to answer the question on its own. An enhancement improves an answer that already works without it.

## How Slack output is fitted

`renderSlackEnvelope` always returns a postable payload, fitting the rendered blocks to Slack's limits (`SLACK_LIMITS`) in a fixed order:

1. **Table character budget.** Slack counts table cell characters across the whole message, not per block, so tables that individually fit can still push the message over. Tables are kept in document order until `tableCellCharsPerMessage` runs out; the rest degrade to one mrkdwn section per row, keyed by the header row.
2. **Section rhythm.** A divider goes in front of every header and the actions block; a spacer follows each content block except a table about to be followed by a divider. Consecutive field-only sections are not spaced, since they read as one grid.
3. **Block budget.** If the block count still exceeds `blocksPerMessage`, spacers are dropped first, from the end backward, since they cost nothing but rhythm. If that alone is not enough, the remainder is truncated and replaced with a trailing context block noting how many were elided.

`assets` is filtered to the requests whose placeholder block survived step 3 — a block `enforceBlockBudget` elides is never posted, so uploading its file would be wasted, orphaned work.

## Formatting helpers

`./markdown` publishes `boldLabelPrefix` and `boldSectionLabel`, and `./slack` the escaping, clamping, and Block Kit constructors. `formatCompactNumber` and the structured-value formatters live on the root entry, since every surface needs them. `./text` publishes no formatters: line width, trend glyphs, and threshold copy are editorial choices a pack makes, not contract.

## Next

[Dispatch](dispatch.md) · [Frame](frame.md)
