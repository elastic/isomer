# Document

`slideDeckFrame` is the `Frame<SlideFrameTheme>` this pack registers with a runtime. It owns the fixed 16:9 canvas geometry, palette resolution, and the one-slide-per-composition rule.

## Geometry

Width 1920 × height 1080 (fixed; `sizesFromNodeHeights: false`). The primitives inside the frame declare no `metrics.svgHeight` because the frame provides the canvas, and `slideFrame` reports the canvas height; the missing-`svgHeight` warning is silent for this pack.

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

The frame draws one footer line and nothing else: the Isomer mark, `brand`, and the section (`sectionNumber` and `section`) on the left, `url` on the right. A slide with no section, such as the title slide, shows `brand` alone. `logo: false` leaves the mark out of the footer and out of a `slideTitle` inside the frame, for a deck about something other than Isomer. `url` is a link on the web surfaces and must be an absolute `http` or `https` address, such as `https://example.com`: a footer has no page to be relative to. One that is not is dropped before render.

## Tone

`tone: 'inverse'` gives the title slide the dark background by redeclaring the page palette for the frame's subtree; see [Theme](theme.md#inverse-tone).

## Degrading to text and markdown

The body renders first, then the footer as one line (`Isomer · 01 Primitives · elastic.github.io/isomer`), italic in Markdown with `url` as a link. Slack sends the same line as a closing `context` block.

A slide opens with its own heading: `slideTitle` or `slideHeading`, each a `#` in Markdown and an `h1` in HTML, with sub-headings inside the slide, such as a `slideSplit` pane label, a `slideTerritoryGroup` owner, or a `slideRoadmap` horizon, at `##` and `h2`. Render a slide with `heading: false` on the `text`, `markdown`, and `slack` surfaces, as on `react` and `html`, so the composition's `title` names the slide without repeating it.

## `slideDeckFrame` vs `slideFrame`

| Symbol | What it is |
| --- | --- |
| `slideDeckFrame` | The `Frame<SlideFrameTheme>` — a document, a host registers with the runtime |
| `slideFrame` | The `PrimitiveNode` type — the 16:9 canvas node authors write |
