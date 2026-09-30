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
| `slideStatement` | One thesis sentence set large on a slide of its own. |
| `slideQuote` | Someone else's words set large, with the source beneath. |
| `slideTitle` | The deck's opening slide, with an optional node beside it. |
| `slideSection` | A section divider: number, title, and the slides it holds. |
| `slideAgenda` | Every section of the talk, with the current one marked. |
| `slideClosing` | The deck's last slide: links and next steps by goal. |
| `slideSource` | One citation line at the foot of a slide. |
| `slideSplit` | Two panes of slide nodes, with a width ratio and a divider. |
| `slideStack` | Slide nodes stacked with controlled spacing, for a one-node slot. |
| `slideList` | Short facts, each optionally keyed by a term, with a caption and a footnote. |
| `slideBulletList` | Short points with a dot, check, or × marker. |
| `slideDefinitions` | Terms and their meanings as a ruled glossary. |
| `slideFanout` | One source branching to several unordered targets. |
| `slidePipeline` | Ordered steps along one path, or chips bracketed by who owns each run. |
| `slideSequence` | Messages between three to five actors, top to bottom in time order. |
| `slideLanes` | Two parallel paths converging on one join step. |
| `slideLayers` | An ordered stack of layers, each with an owner. |
| `slideTerritoryGroup` | Who owns what, one color-keyed column per owner. |
| `slideCode` | Source in one panel, or two joined by an arrow. |
