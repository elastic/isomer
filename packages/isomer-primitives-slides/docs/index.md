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
| `slideFrame` | The 16:9 root node — topbar, body, footer. Required by the document. |
| `slideSplit` | Two-column layout with optional width ratio. |
| `slideStack` | Vertical stack with controlled spacing. |
| `slideWindow` | Browser, terminal, Slack, or chat chrome around nested content. |
| `slideBulletList` | Labeled bullet list with dot, check, or × markers. |
| `slideCardGroup` | Grid of labeled cards with optional badges and tones. |
| `slideCode` | Labeled code block with optional highlighted lines. |
| `slideTable` | Headed grid of short text cells, with a native Slack `table` block. |
| `slideTranscript` | A short exchange between a user, a model, and the host. |
| `slideFlow` | Horizontal sequence of labeled boxes connected by lines. |
| `slideCycle` | A closed loop of steps around a ring, drawn in inline SVG. |
| `slideTerritoryGroup` | Ownership annotations paired with accent colors. |
| `slideTitle` | Eyebrow, headline, and optional lede with inline links. |
