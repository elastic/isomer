---
title: Packs
description: A pack is the vocabulary: which node types exist and how each one renders. Where a frame decides what document an image becomes — exclusive, one per render...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/packs
---

# Packs
A pack is the vocabulary: which node types exist and how each one renders. Where a [frame](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/frame) decides what document an image becomes — exclusive, one per render — a pack is additive. Hand a runtime two packs and you get the union of their types, with a `card` from one sitting beside a `sparkline` from another.
```ts
createIsomerRuntime({ packs: [componentsPack, chartsPack] });
```

Packs are built by `definePrimitivePack` in the SDK, not here — see [the pack contract](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/packs). This page is about what a runtime does with them.

## What a pack contributes


| Contribution      | Used for                                                                           |
|-------------------|------------------------------------------------------------------------------------|
| `primitives`      | The definitions the dispatcher, validator, parser, and schema are built from       |
| `types`           | Duplicate detection across packs                                                   |
| `surfaces`        | Which optional surfaces every primitive implements (only `slack`)                  |
| `enhancements`    | Progressive enhancements the HTML surface may apply, by id                         |
| `slackAssetTypes` | Which node types are pictures, so Slack uploads them instead of approximating them |
| `styleAdapter`    | Optional. Its HTML CSS, combined with every other pack's                           |
| `styleCollector`  | Optional. The collector shape its `collectStyles` hooks expect                     |
| `theme`           | The palette its `svg` renderers require, via `themeBound<T>()`                     |

The last facts are declared by the pack because they are facts about a vocabulary, and a host composing packs it did not write cannot be expected to know them. The runtime unions `slackAssetTypes` and `enhancements` across packs.

## Composing packs

Two rules, both enforced when the runtime is built:
- No node type may be registered by two packs. The dispatcher is keyed on `type` and nothing else, so a duplicate makes dispatch ambiguous.
- No enhancement id may be registered by two packs, for the same reason one level up — the HTML surface flattens enhancements runtime-wide.

Everything else composes silently, with one bound to respect: a pack declares the palette its `svg` renderers read, and every pack in a runtime — plus every frame in its map — has to agree on it. A pack that declares `svg` and one that does not can still sit together; nodes from the second simply produce a validation warning if you try to draw them. Packs whose renderers want _different_ palettes belong in different runtimes, which is what [Frame](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/frame) covers.

## Why packs are additive

Vocabulary and document are independent. Splitting them makes a pack purely additive. Nothing about a primitive decides the frame, so any pack's nodes can be drawn inside any frame.
What replaced frame ownership is a type-level bound rather than a runtime check — a pack states the palette it needs, and the compiler pairs it with a frame that supplies one.

## CSS composes too

A pack ships its own `styleAdapter`, and the runtime combines them: every adapter gets a collector, each style handle is routed to the adapter that owns it, and the emitted `<style>` is their concatenation. So styled packs are as additive as their vocabularies, and a host loading two of them supplies nothing.
The same routing applies to `collectStyles`: an adapter's walk fires the hooks of the pack that declared it and no other, so one pack's rules never land in another's stylesheet. A type no adapter-declaring pack owns still reaches every adapter, since nothing says where it belongs.
Routing needs `ownsHandle` on each adapter. Combining two where one cannot answer throws, naming the pack that should declare it. A pack is also CSS-bearing when any of its primitives declare `collectStyles`; construction throws if such a pack has no adapter at all, naming both the pack and the primitive.
A CSS-bearing pack should also declare `styleCollector`, naming the collector shape its hooks mutate — `DISTILLATE_STYLE_COLLECTOR` for a Distillate-backed pack. Adapters publish the same tag, and construction throws when they disagree. Without it the mismatch surfaces as a corrupted collector at render instead.
A host that wants a CSS-bearing pack on text or Slack only supplies a no-op adapter, which replaces every pack's; see [Surfaces](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces).

## Next

[Frame](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/frame) · [Renderer overrides](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/renderer-overrides) · [The pack contract](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/packs)