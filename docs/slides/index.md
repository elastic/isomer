---
navigation_title: Slides pack
description: "The reference primitive pack: slide-deck primitives, a theme with one source per rendered value, and a fixed 16:9 frame."
---

# Slides pack

The in-repo reference primitive pack for Isomer. Slide-deck primitives, every surface (`snapshot` exists only when the runtime is given frames), one fixed-size document.

## Documentation

| Page | What it covers |
| --- | --- |
| [Authoring a primitive](primitives.md) | Colocated renderers and why the split exists |
| [Pack contract](contract.md) | `definePrimitive`, the pack's theme bound, the surface declaration |
| [Document](document.md) | Geometry, `validateBody`, `wrap` |
| [Theme](theme.md) | The one-field bound and how palette selection works |
| [Styling](styling.md) | Distillate collection, the pack's own adapter, and the React surface |
| [Copy buttons](copy.md) | The `slideCopy` enhancement on `slideCommand` |
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
| `slideRoadmap` | Planned work in ruled columns by horizon, at most one current. |
| `slideFanout` | One source branching to several unordered targets. |
| `slidePipeline` | Ordered steps along one path, or chips bracketed by who owns each run. |
| `slideSequence` | Messages between three to five actors, top to bottom in time order. |
| `slideLanes` | Two parallel paths converging on one join step. |
| `slideLayers` | An ordered stack of layers, each with an owner. |
| `slideTerritoryGroup` | Who owns what, one color-keyed column per owner. |
| `slideGraph` | Named terms in a main chain, with at most one node above and one below. |
| `slideTimeline` | Dated points on a rail, read left to right, at most one current. |
| `slideTree` | A folder and its entries, each with a one-line note. |
| `slideStat` | One headline number beside the sentence that explains it, as a band under the body. |
| `slideStats` | Two to four comparable numbers in ruled columns. |
| `slideDelta` | One number before and after a change, with what the change means. |
| `slideBars` | Comparable amounts drawn as horizontal bars, at most one highlighted. |
| `slideTable` | A headed table of short cells, optionally in labeled groups. |
| `slideMatrix` | Yes, partial, or no marks for each row against each column. |
| `slideQuadrant` | Items sorted into four quadrants by two labeled axes. |
| `slideCode` | Source in one panel, or two joined by an arrow. |
| `slideDiff` | Source with the lines a change added and removed marked. |
| `slideCommand` | One shell command on a single line, with an optional [Copy button](copy.md). |
| `slideTranscript` | A short exchange between a user, a model, and the host, turn by turn. |
| `slideColumns` | Two to four parallel options, one recommended. |
| `slideWindow` | Slide nodes in one app's title bar: a browser, terminal, chat, or Slack channel. |
| `slideRender` | Another slide as one surface renders it, or a placeholder for a host reference. |
| `slideRenderGrid` | One slide on two to six surfaces, side by side. |
| `slideAnnotatedRender` | A `slideRender` with numbered pins and a legend. |

A render's `body` is the slide it embeds, not a walked child: its ids are its own, it renders no node anchors, and in JSX it is a prop of elements, `<SlideRender surface="snapshot" body={[<SlideFrame>…</SlideFrame>]} />`; passed as children, it throws `UNEXPECTED_CHILDREN`. An embedded slide lays out on a fresh full slide wherever the render sits, and is drawn scaled to fit the render's room. The runtime's input budget bounds an embedded body with the rest of the composition before it is parsed. `resolveSlideRenders(slides, { primitives })` fills each `slide` reference in a deck with that slide's body; pass every pack's primitives when renders sit inside another pack's containers. It reads each slide through `checkInputBudget` first, so a slide past the budget is refused before it is walked; pass `inputBudget` when the runtime overrides a limit. A slug naming two slides always throws, whatever `onUnresolved` is. An embedded body is one `slideFrame` alone, or loose nodes that are not frames. The checks that keep a render out of an embedded body and a window out of a window follow the child slots this pack's primitives declare, and read another pack's node as data, so a render or window inside another pack's container is not caught; `resolveSlideRenders` follows the slots of its `primitives`. A panel draws the top-level nodes its surface shows, so a `snapshot` panel follows each node's `snapshot` visibility. A panel printing another surface's output clips what runs past its edge. An annotated render's `render` takes `id` and `surfaces` like any node, and one hidden from `react` leaves the legend alone there. Ordered primitives reveal one part per click; see [builds](builds.md).
