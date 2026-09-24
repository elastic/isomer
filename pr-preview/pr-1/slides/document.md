---
title: Document
description: slideDeckFrame is the Frame<SlideFrameTheme> this pack registers with a runtime. It owns the fixed 16:9 canvas geometry, palette resolution, and the one-slide-per-composition...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/slides/document
---

# Document
`slideDeckFrame` is the `Frame<SlideFrameTheme>` this pack registers with a runtime. It owns the fixed 16:9 canvas geometry, palette resolution, and the one-slide-per-composition rule.

## Geometry

Width 1920 × height 1080 (fixed; `sizesFromNodeHeights: false`). The eight non-frame primitives declare no `metrics.svgHeight` because the frame provides the canvas, and `slideFrame` reports the canvas height; the missing-`svgHeight` warning is silent for this pack.

## `validateBody`

```ts
validateBody: (body) => {
  const [slide, ...rest] = body;
  if (!slide || rest.length > 0)
    return [`an svg render needs exactly one "slideFrame" node, got ${body.length} nodes; …`];
  if (slide.type !== 'slideFrame')
    return [`an svg render needs a "slideFrame" root, got "${slide.type}"; …`];
  return [];
},
```

Called by the SVG surface before drawing. `runtime.validate` does not call it — it is frame-agnostic; the check runs only on the frame a render names.

## `wrap`

```ts
wrap: (_header, body, _viewport) => body[0],
```

`slideFrame` already owns the full 16:9 canvas, so this returns the one body element as the image's root. A host that wants letterbox or watermark spreads the frame value and replaces `wrap`.

## Naming

The frame is called `slideDeckFrame` (qualified) to avoid colliding with the `slideFrame` primitive type, whose wire name cannot change without invalidating every composition a model has seen. `slide` in `frame: { slide: slideDeckFrame }` is the host's chosen name, not something the pack fixes. A render that wants this document asks for `{ frame: 'slide' }`.

## Footer chrome

The footer's left side always renders the mark and the theme's `frame.brandLabel`; `footer` (right side) is the only configurable footer text. There is no node field to replace or hide the mark.

## Degrading to text and markdown

`chapter` (and `chapterNumber`, if present) becomes an `h2` heading ahead of the body, the same level as a slide title. `brand` and `footer` are image-only chrome and do not reach either surface.

## `slideDeckFrame` vs `slideFrame`


| Symbol           | What it is                                                                   |
|------------------|------------------------------------------------------------------------------|
| `slideDeckFrame` | The `Frame<SlideFrameTheme>` — a document, a host registers with the runtime |
| `slideFrame`     | The `PrimitiveNode` type — the 16:9 canvas node authors write                |