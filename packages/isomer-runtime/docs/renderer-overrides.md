# Renderer overrides

An override replaces one renderer, for one primitive type, on one surface. It is the seam a host reaches for when a pack is nearly right — a table drawn with the host's own React component, say — without forking the pack or losing its other five renderers.

```ts
createIsomerRuntime({
  packs: [componentsPack],
  rendererOverrides: {
    table: { react: (node, { context }) => <HostTable node={node} {...context} /> },
  },
});
```

That table keeps its text, markdown, and Slack renderers. Only React changed — and because the `svg` surface dispatches to `react`, the image picks the override up too.

## What can be overridden

Four renderer keys: `react`, `text`, `markdown`, `slack`. There is no `svg` key, because that surface has no renderer of its own. The signatures are the ones the runtime holds, with the node union heterogeneous and theme and context erased. `env` and `output` are derived from the SDK's `SurfaceMap` over `RuntimePackTypes<unknown>` so the bags cannot drift; `RuntimeRendererOverrides` is the exported map type:

```ts
type Erased = SurfaceMap<RuntimePackTypes<unknown>>;

react(node: PrimitiveNode, env: Erased['react']['env']): ReactNode;
text(node: PrimitiveNode, env: Erased['text']['env']): string;
markdown(node: PrimitiveNode, env: Erased['markdown']['env']): string;
slack(node: PrimitiveNode, env: Erased['slack']['env']): Erased['slack']['output'];
```

They are declared method-style, which makes their parameters bivariant, so a host may write an override against its own node type — `(node: TableNode) => …` — rather than widening to `PrimitiveNode` and narrowing again inside.

## What is checked

Both halves of every entry, at construction:

- The primitive type must be one some pack registers, or `renderer override targets unregistered primitive type "…"`.
- The surface key must be one of the four, or `renderer override for "table" targets unknown surface "…"`. A typo would otherwise be merged into `renderers` as a field nothing ever reads.

The value side is typed, so `{ table: { react: 42 } }` no longer type-checks its way to a render-time failure.

## Two details worth knowing

`undefined` renderer values are filtered before the merge, so `{ react: undefined }` leaves the pack's real React renderer in place. That is the difference between an override map and a spread — a host computing an override conditionally does not have to guard the key.

The merge rebuilds each pack rather than mutating it, and applies **before** the runtime flattens its inventory. Every consumer — dispatcher, validator, parser, authoring context, and all six surfaces — therefore sees the overridden definitions, and a pack keeps ownership of its node types. Overrides replace `renderers` only, never `collectStyles`.

## When to reach for something else

An override is for a rendering that differs, not a vocabulary that differs. If you need a new node type, write a pack; the runtime composes any number of them. If you need a different frame or palette for images, supply a [frame](frame.md). If you need different CSS or class names for HTML, supply a `styleAdapter` — the runtime's other seam, and the only one for CSS.

Packs ship their own adapters and the runtime combines them, so `styleAdapter` on the runtime replaces all of them at once. A CSS-bearing pack with no adapter from either side throws at construction; see [Surfaces](surfaces.md).

## Next

[Packs](packs.md) · [Frame](frame.md) · [Runtime](runtime.md)
