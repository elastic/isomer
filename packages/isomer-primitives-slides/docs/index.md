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
| `slideTerritoryGroup` | Who owns what, one color-keyed column per owner. |
| `slideCode` | Source in one panel, or two joined by an arrow. |
| `slideColumns` | Two to four parallel options, one recommended. |
| `slideWindow` | Slide nodes in one app's title bar: a browser, terminal, chat, or Slack channel. |
| `slideRender` | Another slide as one surface renders it, or a placeholder for a host reference. |
| `slideRenderGrid` | One slide on two to six surfaces, side by side. |
| `slideAnnotatedRender` | A `slideRender` with numbered pins and a legend. |

A render's `body` is the slide it embeds, not a walked child: its ids are its own, it renders no node anchors, and in JSX it is a prop of elements, `<SlideRender surface="svg" body={[<SlideFrame>…</SlideFrame>]} />`; passed as children, it throws `UNEXPECTED_CHILDREN`. An embedded slide lays out on a fresh full slide wherever the render sits, and is drawn scaled to fit the render's room. Checking that a body holds no other render walks at most 64 levels and 10,000 values; a deeper or larger body is refused. `resolveSlideRenders(slides, { primitives })` fills each `slide` reference in a deck with that slide's body; pass every pack's primitives when renders sit inside another pack's containers. An embedded body is one `slideFrame` alone, or loose nodes that are not frames. Ordered primitives reveal one part per click; see [builds](builds.md).
