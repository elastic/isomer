---
navigation_title: Slides pack
description: "The reference primitive pack: slide-deck primitives, a theme with one source per rendered value, and a fixed 16:9 frame."
---

# Slides pack

The in-repo reference primitive pack for Isomer. Slide-deck primitives, every surface (`svg` exists only when the runtime is given frames), one fixed-size document.

## Documentation

| Page | What it covers |
| --- | --- |
| [Authoring a primitive](primitives.md) | Colocated renderers and why the split exists |
| [Pack contract](contract.md) | `definePrimitive`, `themeBound`, the surface declaration |
| [Document](document.md) | Geometry, `validateBody`, `wrap` |
| [Theme](theme.md) | The one-field bound and how palette selection works |
| [Styling](styling.md) | Distillate collection, the pack's own adapter, and the React surface |
| [Worked example](example.md) | The example compositions, their artifacts, and how to get a PNG |

## Quick start

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  slideDeckFrame,
  slidesPack,
} from '@elastic/isomer-primitives-slides';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

// Render a composition on any surface:
runtime.surfaces.html.render(composition);
runtime.surfaces.text.render(composition);
```

## Primitives

| Type | Description |
| --- | --- |
| `slideFrame` | The 16:9 root node: the slide body and a one-line footer. Required by the document. |
| `slideHeading` | A content slide's claim and optional lede. |
| `slideTitle` | The deck's opening slide, with an optional node beside it. |
| `slideSplit` | Two panes of slide nodes, with a width ratio and a divider. |
| `slideStack` | Slide nodes stacked with controlled spacing, for a one-node slot. |
| `slideBulletList` | Short points with a dot, check, or × marker. |
| `slideTerritoryGroup` | Who owns what, one color-keyed column per owner. |
| `slideStat` | One headline number beside the sentence that explains it, as a band under the body. |
| `slideStats` | Two to four comparable numbers in ruled columns. |
| `slideDelta` | One number before and after a change, with what the change means. |
| `slideBars` | Comparable amounts drawn as horizontal bars, at most one highlighted. |
| `slideTable` | A headed table of short cells, optionally in labeled groups. |
| `slideMatrix` | Yes, partial, or no marks for each row against each column. |
| `slideQuadrant` | Items sorted into four quadrants by two labeled axes. |
| `slideCode` | Source in one panel, or two joined by an arrow. |
