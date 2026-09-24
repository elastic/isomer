---
title: Frame
description: A frame is a document: the picture-frame an svg render sits inside, plus the geometry that sizes it and the palette it draws with. Where a pack is additive...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/frame
---

# Frame
A frame is a document: the picture-frame an `svg` render sits inside, plus the geometry that sizes it and the palette it draws with. Where a [pack](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/packs) is additive vocabulary, a frame is exclusive — a render produces one document, a 760-pixel card **or** a fixed 1920×1080 slide, and a render names the one it wants.
The SDK owns the type; a theme package or a pack supplies instances; this package is where a host registers them and picks one per render. See [the frame contract](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/frame) for `wrap`, `FrameHeader`, and `FrameViewport`.
```ts
const cardRuntime = createIsomerRuntime({
  packs: [componentsPack, chartsPack],
  frames: { card: cardFrame },
});

cardRuntime.surfaces.svg.render(composition);
cardRuntime.surfaces.svg.render(composition, { frame: 'card' });
```

The key is the frame's name: a render that names none uses the default, and `{ frame: 'card' }` is the same string the host registered.
Frame is a runtime input, not a pack asset. Nothing about a primitive decides the document, so a host reframes a vocabulary by passing a different frame rather than by forking a pack. What a runtime cannot do is hold frames whose palettes are unrelated — see the theme bound below.

## Frame decides the `svg` surface's existence

Supply no `frames` and `surfaces.svg` is `undefined`, and the type says so: `createIsomerRuntime` is overloaded so a call with `frames` returns a runtime whose `svg` is present, and a call without returns one whose `svg` is `undefined`.
```ts
const noImages = createIsomerRuntime({ packs: [componentsPack] });
noImages.surfaces.svg;
noImages.getCapabilities().formats;
```

With exactly one frame, that frame is the default and `defaultFrame` is optional. With two or more, `defaultFrame` is required, and naming one the runtime does not hold is an error that lists the names it does.

## What a frame owns


| Responsibility         | Effect                                                                             |
|------------------------|------------------------------------------------------------------------------------|
| `defaultWidth`         | The width a render uses unless the caller passes one                               |
| `estimateHeight`       | The height a render uses unless the caller passes one                              |
| `sizesFromNodeHeights` | Whether a missing `metrics.svgHeight` on a primitive is worth warning about        |
| `theme`                | A palette per mode; an image has no media queries, so it commits to one            |
| `validateBody`         | What this document requires of a body — the slide rule of exactly one `slideFrame` |
| `wrap`                 | The surround drawn around the dispatched body                                      |

The body itself is dispatched generically, and the frame is handed the composition's title, subtitle, and theme with the body nodes withheld — a frame that could read the nodes could branch on a pack's node types, which is exactly the knowledge this split keeps out of it.
`sizesFromNodeHeights` is unioned across every frame the runtime holds. Any one frame that measures nodes makes the metric load-bearing; a runtime whose frames are all fixed-size stays quiet about a value nothing reads.

## Rendering with one

```ts
const svg = runtime.surfaces.svg;
const viewport = svg.resolveViewport(composition);
const { element, css } = svg.render(composition, { theme: 'light' });
```

`resolveViewport` exists because a rasterizing host needs the viewport before it needs the element. Since it is usually called first, an unknown frame name throws there rather than being reported — that is the message such a host meets.
`render` validates, resolves the frame, checks the frame's own body rule, resolves geometry, then hands the frame and the dispatcher to `BoundFrame.render`. The body-rule check throws rather than returning a result: `render` already validated, so this is the backstop for a composition that arrived another way, or one validated under a different frame than it is now drawn in.

## A runtime is homogeneous in its theme

`IsomerRuntimeOptions.frames` is `FrameMap<TTheme>`, and a pack declares the palette its frames must supply through a phantom marker on `PrimitivePack<TTheme>`. `TTheme` is inferred from the packs first, so a mismatch is reported against `frames` and never names the pack that set the bound — pairing charts with a slide frame reads as `Frame<SlideSvgTheme>` is not assignable to `Frame<SvgRenderTheme>`.
A pack that genuinely reads no theme omits `theme` and stays at `PrimitivePack<unknown>`, which bare `PrimitivePack` also means. A pack that needs a frame to carry tokens passes `theme: themeBound<CoreTokens>()`. The runtime's own storage slots are `AnyPrimitivePack`.
Packs wanting different palettes belong in different runtimes. A composition is routed to the runtime that owns its node types before anything else happens to it.

## Next

[Surfaces](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces) · [The frame contract](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/frame)