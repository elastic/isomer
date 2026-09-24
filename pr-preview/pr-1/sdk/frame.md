---
title: Frame
description: A frame is a document: the picture-frame an svg render sits inside, the geometry that sizes it, the palette it draws with, and whatever it requires of...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/frame
---

# Frame
A frame is a document: the picture-frame an `svg` render sits inside, the geometry that sizes it, the palette it draws with, and whatever it requires of a body it is asked to draw. The SDK owns the type; a theme package or a pack supplies instances; a host passes them to the runtime and names one per render.
`Frame` is the picture-frame sense, not browser chrome. The hook that surrounds an already-rendered body is `wrap`, not `render`.
```ts
interface Frame<TTheme> {
  defaultWidth: number;
  sizesFromNodeHeights?: boolean;
  theme: { light: TTheme; dark: TTheme };
  estimateHeight(composition, dispatcher): number;
  validateBody?(body): readonly string[];
  wrap: (header, body, viewport) => ReactNode;
}
```

A frame is named by the key a host registers it under, not by a field it carries.
`body` here is `FrameBody` (`readonly ReactNode[]`), the already-rendered output, distinct from `Composition.body` (raw `PrimitiveNode[]`).

## Why a frame is not a pack asset

A vocabulary (which primitives exist — additive, any number) and a document (what gets produced — exclusive, one per render) are independent. Splitting them makes a pack purely additive. Nothing about a primitive decides the frame, so any pack's nodes can be drawn inside any frame.

## The two halves of drawing

`Frame.wrap` draws only the surround. `BoundFrame.render` walks the composition's body through the runtime-wide dispatcher first — keyed on node type, never needing to know which pack a node came from — and hands `Frame.wrap` the already-rendered result.
What the frame is told is deliberately narrow:
```ts
interface FrameHeader {
  title?: string;
  subtitle?: string;
  theme?: RenderTheme;
}
```

The body is **withheld**, not merely undeclared. The runtime names these three fields into a fresh value per render, because narrowing the type alone would leave `body` reachable and spreading the composition would carry through whatever else the caller's value holds. A frame that could read the nodes could branch on a pack's node types, which is exactly the knowledge this split keeps out of it.
`wrap` takes the rendered body as an **array** rather than one `ReactNode`, so a frame that draws no surround can return its single root element — image layout starts from one element, and a fragment is not one.

## Viewport and theme

```ts
interface FrameViewport<TTheme> {
  width: number;
  height: number;
  theme: TTheme;
  mode: RenderTheme | undefined;
}
```

An image has no media queries, so it must commit to one palette; `bindFrame` resolves `light`/`dark` per render and `auto` resolves light. The type is named for the viewport rather than the frame because `wrap` draws *a* frame within it.
`BoundFrame.resolveTheme(mode)` resolves the same palette, erased to `unknown`. The `svg` surface calls it once per render and hands the result to `renderSvg` as `theme`, which reaches a primitive's `react` renderer as `env.theme` — see [Dispatch](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/dispatch).

## `bindFrame`, and the theme bound around it

`bindFrame` resolves a frame's palette per render and returns a `BoundFrame` — `defaultWidth`, a defaulted `sizesFromNodeHeights`, `estimateHeight`, `validateBody`, `render`, and `renderNode` — with no `TTheme` left in any signature. The erasure is a closure rather than a type parameter because the runtime dispatches every node through one inventory keyed by node type, and that inventory has no single theme to name.
What makes the erasure safe is that a runtime is **homogeneous** in its theme. A pack declares what its `svg` renderers read through a phantom marker on `PrimitivePack<TTheme>` — so the palette is checked where the real type is still known, and only the resolved result is stored.

## `validateBody`

What this document requires of a body — the slide document's exactly-one-`slideFrame` rule is the example. It returns messages rather than throwing, and note where it is *not* consulted: `runtime.validate` is frame-agnostic and has to be, because the same composition can be valid in one frame and not another. Only the `svg` surface checks it, on the frame a render actually names.

## `sizesFromNodeHeights`

Whether `estimateHeight` sums per-node heights, and therefore whether a primitive with no `metrics.svgHeight` under-sizes the frame. Defaults to `true`, because the gap is silent and measuring frames is the normal case; a fixed-size document sets `false` once and stops validation reporting a metric nothing reads.
With a measuring frame registered, the [quick start](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/quick-start)'s `kpi` pack, which declares no `metrics.svgHeight`, validates as:
```ts
runtime.validate(composition);
// valid: true, and two warnings, both with surface 'svg':
//   body[0] type "kpi" declares no svgHeight metric and will be measured as 0, sizing the frame short
//   body[1] type "kpi" declares no svgHeight metric and will be measured as 0, sizing the frame short
```

The same call reports nothing when the runtime has no frame, or only frames with `sizesFromNodeHeights: false`.

## Next

[Dispatch](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/dispatch) for `renderSvg` and `estimateSvgHeight`