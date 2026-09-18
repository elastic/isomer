# Dispatch

The dispatcher is how a node reaches its renderer. It is built once from a flat list of definitions, keyed on `type` and nothing else, and every surface renders through it — which is what keeps one inventory behind all of them.

```ts
const dispatcher = createPrimitiveDispatcher<MyNode, MyPackTypes>(definitions, {
  label: 'isomer runtime',
  isSlackAssetType: (type) => pictureTypes.has(type),
});
```

Duplicate types throw at construction, with the label in front of the message so a composed runtime says which one.

## What it exposes

| Method                                 | Returns                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------------- |
| `renderOn(surface, node, extras)`      | The surface's output, or `undefined` when the node is hidden or has no renderer |
| `renderReact(node, context?)`          | `ReactNode`                                                                     |
| `renderSvg(node, context, theme, key)` | `ReactNode` — the `react` renderer, gated on `svg` visibility and keyed         |
| `renderText(node)`                     | `string` — empty when nothing rendered                                          |
| `renderMarkdown(node)`                 | `string` — empty when nothing rendered                                          |
| `renderSlack(node, collector?)`        | `readonly T['slackBlock'][]` — `SlackBlock` unless the pack binds it            |
| `collectStyles(node, styles, context)` | nothing; the collector is mutated                                               |
| `estimateSvgHeight(node)`              | `number` — `0` when hidden or unmeasured                                        |
| `validate(node, path, errors)`         | nothing; errors are appended                                                    |
| `definitions`, `getDefinition(node)`   | the inventory, and one entry — `getDefinition` throws on an unknown type        |

## What every render goes through

`renderOn` is the single path, and it applies three things in order before a renderer ever sees the node.

**Surface visibility.** A node may carry `surfaces: ['text', 'markdown']`, and anything outside that list returns `undefined` — deliberately absent, not empty. This is how an author hides a decorative node from text or a text-only note from an image.

**Renderer presence.** No renderer for this surface, `undefined` again. For `text` and `markdown` the wrappers coerce that to `''`; for `svg` the absence is what validation warns about.

**`sanitize`.** The definition's hook runs on the node, and may return `null` to drop it. Because it sits here rather than in each renderer, a renderer invoked with an unvalidated node still cannot emit an unsafe URL.

`renderSvg`'s `theme` reaches the renderer as `env.theme`: the frame's resolved palette for this render, supplied by `BoundFrame.resolveTheme`. `renderReact`/the `react` surface pass no theme — a bare React render has no `Frame` to resolve one from — so `env.theme` is `undefined` there. A container recursing into a child on the `svg` surface forwards it explicitly through `scope.renderOn('svg', child, { context, theme })`; `scope.renderReact` does not carry it.

## RenderScope

Container primitives recurse — a `row` renders its children — but a pack cannot import another pack's renderers. Every renderer receives the dispatcher as `scope` on its env bag, erased to `PrimitiveNode` so a child owned by another pack still type-checks:

```ts
text: (node, { scope }) =>
  node.items.map((item) => scope.renderText(item)).join('\n');
```

The dispatcher's own methods (`renderText(node)`, `renderSlack(node, collector?)`, …) stay positional. React containers that defer children into components still have a second route from `@elastic/isomer-sdk/react` — `useReactPrimitiveDispatcher()` reads the dispatcher from context, because React invokes those children after the parent renderer has returned.

## Slack: two behaviours the other surfaces do not have

`renderSlack` is the only method with real branching, because Slack is the surface with both a fallback and an upload path.

**Picture swap.** When a collector is passed and the node's type was declared a picture by its pack, the node never reaches its renderer: the dispatcher renders its _text_ as alt text, allocates a file reference, and emits an `image` block. That is how a chart arrives in Slack as a PNG rather than as a markdown approximation of one.

**Markdown fallback.** With no Slack renderer, the dispatcher converts the node's mandatory markdown to Block Kit. A missing renderer degrades; it does not disappear.

The collector is opt-in, so default output stays safe for a caller that cannot upload files. `slackBlock` and `slackCollector` default to `SlackBlock` and `SlackAssetCollector` in `DefaultPackTypes`, so a dispatcher built from any pack is already a `SlackEnvelopeDispatcher`; a pack narrows them only when it carries its own block extensions.

## Next

[Rendering](rendering.md) for the envelopes wrapped around these calls · [Primitives](primitives.md) for what the renderers are · [Frame](frame.md) for the `svg` walk
