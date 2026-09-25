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
| [Worked example](example.md) | The seven example compositions, their artifacts, and how to get a PNG |

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
| `slideFrame` | One 16:9 slide: body plus a footer line. `tone: 'inverse'` for title, section, and closing slides. Required by the document. |
| `slideHeading` | The claim and lede every content slide opens with. |
| `slideTitle` | The inverse title slide: eyebrow, display title, tagline, definition, and an `aside` node. |
| `slideSection` | A section divider listing the section's slides, each a link on web surfaces. |
| `slideClosing` | The inverse closing slide: live links and where to go next. |
| `slideSplit` | Two full-height columns of strings or slide nodes, divided by a gap, a rule, or an arrow. |
| `slideStack` | Nodes stacked vertically inside a split column or window. |
| `slideWindow` | One title bar around nested content: a terminal, browser, Slack channel, or chat. |
| `slideFanout` | One source branching to several targets. |
| `slideTimeline` | Three to five points on a rail, one of them current. |
| `slidePipeline` | Numbered steps on one rail, with optional spans bracketing who owns which steps. |
| `slideLanes` | Two parallel paths converging on one node. |
| `slideGraph` | A small fixed-layout diagram of terms and how they relate. |
| `slideStat` | One large number with the sentence that explains it. |
| `slideStats` | Two to four comparable numbers. |
| `slideColumns` | Two to four parallel options with tags. |
| `slideDefinitions` | Terms a reader must learn, each with its definition. |
| `slideList` | Short facts, with optional mono terms. |
| `slideBulletList` | A short unordered list with dot, check, or × markers. |
| `slideTree` | A folder as a file tree, each entry described. |
| `slideTable` | A headed grid of short cells, optionally grouped, with a native Slack `table` block. |
| `slideCode` | One or two code panels; two show a trace with an arrow. |
| `slideTranscript` | A short exchange between a user, a model, and the host. |
| `slideTerritoryGroup` | Who owns what, color-keyed. |
| `slideRender` | A real render of another slide or composition on one surface. |
| `slideRenderGrid` | One composition rendered on several surfaces. |

## Authoring with an agent

`buildSlidesAuthoringPrompt()` returns the prompt a model needs to write slides with this pack: the guide (`slidesAuthoringGuide`), the rules (`slidesAuthoringRules`), every primitive's catalog entry, and the authoring JSON Schema. A host that composes other packs passes its runtime's `getAuthoringContext()` `schema` and `primitives` instead.
