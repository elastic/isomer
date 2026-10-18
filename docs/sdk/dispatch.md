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

| Method                                        | Returns                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------------------- |
| `renderOn(surface, node, extras)`             | The surface's output, or `undefined` when the node is hidden or has no renderer |
| `renderReact(node, context?)`                 | `ReactNode`                                                                     |
| `renderSnapshot(node, context, theme, key)`   | `ReactNode` — the `react` renderer, gated on `snapshot` visibility and keyed    |
| `renderText(node)`                            | `string` — empty when nothing rendered                                          |
| `renderMarkdown(node)`                        | `string` — `md` content serialized; empty when nothing rendered                 |
| `renderMarkdownContent(node)`                 | `MarkdownContent` — the child's content, empty when it is hidden                |
| `renderSlack(node, collector?, { baseUrl }?)` | `readonly T['slackBlock'][]` — `SlackBlock` unless the pack binds it            |
| `collectStyles(node, styles, context)`        | nothing; the collector is mutated                                               |
| `estimateSnapshotHeight(node)`                | `number` — `0` when hidden or unmeasured                                        |
| `validate(node, path, errors)`                | nothing; errors are appended                                                    |
| `definitions`, `getDefinition(node)`          | the inventory, and one entry — `getDefinition` throws on an unknown type        |

## What every render goes through

`renderOn` is the single path, and it applies three things in order before a renderer ever sees the node.

**Surface visibility.** A node may carry `surfaces: ['text', 'markdown']`, and anything outside that list returns `undefined` — deliberately absent, not empty. This is how an author hides a decorative node from text or a text-only note from an image.

**Renderer presence.** No renderer for this surface, `undefined` again. For `text` and `markdown` the wrappers coerce that to `''`; for `snapshot` the absence is what validation warns about.

**`sanitize`.** The definition's hook runs on the node, and may return `null` to drop it. Because it sits here rather than in each renderer, a renderer invoked with an unvalidated node still cannot emit an unsafe URL.

`renderSnapshot`'s `theme` reaches the renderer as `env.theme`: the frame's resolved palette for this render, supplied by `BoundFrame.resolveTheme`. `renderReact`/the `react` surface pass no theme — a bare React render has no `Frame` to resolve one from — so `env.theme` is `undefined` there; [Light and dark](rendering.md#light-and-dark) covers color the stylesheet does not reach. On `snapshot`, a container's `scope.renderReact(child, context)` preserves the frame palette and snapshot visibility through every descendant, even when the container passes a fresh context. The scope retains those values when passed to a deferred React component. `scope.renderOn` selects its surface and extras explicitly.

## RenderScope

Container primitives recurse — a `row` renders its children — but a pack cannot import another pack's renderers. Every renderer receives a render scope as `scope` on its env bag, erased to `PrimitiveNode` so a child owned by another pack still type-checks:

```ts
text: (node, { scope }) =>
  node.items.map((item) => scope.renderText(item)).join('\n');
```

The dispatcher's own methods (`renderText(node)`, `renderSlack(node, collector?)`, …) stay positional. A React container that defers children into a component passes that component `scope`, since React invokes it after the parent renderer has returned.

## Slack: three behaviours the other surfaces do not have

`renderSlack` is the only method with real branching, because Slack is the surface with both a fallback and an upload path.

**Picture swap.** When a collector is passed and the node's type was declared a picture by its pack, the node never reaches its renderer: the dispatcher renders its _text_ as alt text, allocates a file reference, and emits an `image` block. That is how a chart arrives in Slack as a PNG rather than as a markdown approximation of one.

**Markdown fallback.** With no Slack renderer, the dispatcher converts the node's mandatory markdown to Block Kit. A missing renderer degrades; it does not disappear.

**Relative links.** `renderSlack`'s `baseUrl` reaches the renderer as `env.baseUrl` and the markdown fallback as its base, and the `scope` a Slack renderer is handed carries it to every child it renders through `scope.renderSlack` or `scope.renderOn('slack', …)`, so a container forwards nothing. A leaf renderer that builds its own links passes it on: `link(href, label, baseUrl)` or `slackLinkUrl(href, baseUrl)`. [URL trust](url-trust.md#relative-links-on-slack) covers what resolves.

Content built with `md` is read from its tree by `markdownContentToSlackBlocks`: paragraphs, headings, lists, and code become `rich_text`, whose text is literal and whose bold, italic, strikethrough, and code are style flags, so nothing is escaped and nesting survives exactly; tables become `table` blocks, a formatted cell as rich text, and a thematic break a `divider`. A hard break is a line break. A quote is one level, nested quotes spread into it: its text is a `rich_text_quote`, and a list or code block it holds keeps a quote border. Inside a list item, a quote's blocks are the item's; a block a rich-text list item cannot hold, such as a table, follows the item on its own, and the list resumes after it. Links keep the URL policy, and an image becomes a link to its source. Slack cannot resolve a relative URL, so only an absolute `http`, `https`, or `mailto` URL links, or a relative link when a `baseUrl` is given (`markdownContentToSlackBlocks(content, { baseUrl })`); any other link prints its styled label, and an image with a relative source its alt text.

`md.authored` source is parsed where it sits, with the CommonMark and GFM parser that sanitizes it, and its tree is translated the same way. Escapes and character references resolve to the characters they stand for, a link or image reference to its first definition, a footnote prints its `[^label]`, and a task item leads with `☑` or `☐`. Raw HTML prints as text. Source past the parse budget `md.authored` applies prints as its literal paragraphs: Markdown output carries it as inert text, with its `[`, `]`, `\`, and `<` escaped, but Slack prints the authored characters.

`renderMarkdownContent` from `./react` reads the same tree into React elements, so a pack's `react` renderer needs no Markdown parser of its own: paragraphs, headings, lists (with task boxes and an ordered list's `start`), quotes, code (`language-*` class), tables (with column alignment), thematic breaks, inline marks, links, and images. The elements are unstyled. Links keep the URL policy as `md` applies it, checking each destination as parsed, without decoding it again, as React sets it literally: a blocked link keeps its label on `#`, and a blocked image prints its alt text. A reference link or image keeps its definition's title. A list is loose, with each item's paragraphs as `p`, when it or any item is spread, or an item holds two paragraphs; a loose task item's box leads its first `p`. Unlike Slack, a relative URL links. A footnote prints as a paragraph led by its `[^label]`.

The collector is opt-in, so default output stays safe for a caller that cannot upload files. `slackBlock` and `slackCollector` default to `SlackBlock` and `SlackAssetCollector` in `DefaultPackTypes`, so a dispatcher built from any pack is already a `SlackEnvelopeDispatcher`; a pack narrows them only when it carries its own block extensions.

## Next

[Rendering](rendering.md) for the envelopes wrapped around these calls · [Primitives](primitives.md) for what the renderers are · [Frame](frame.md) for the `snapshot` walk
