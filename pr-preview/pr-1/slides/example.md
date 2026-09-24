---
title: Worked example
description: Five compositions that together exercise every primitive. A host sequences them; Isomer renders one composition at a time. The runtime sees one composition...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/slides/example
---

# Worked example
Five compositions that together exercise every primitive. A host sequences them; Isomer renders one composition at a time.

## A deck is a `Composition[]`

```ts
// A deck is a sequence of Compositions — Isomer deliberately does not model
// sequencing, because sequencing is routing and routing belongs to the host.
export const deck: Composition[] = [
  { type: 'view', title: 'Title slide', body: [titleSlide] },
  { type: 'view', title: 'Split layout', body: [splitSlide] },
  // …
];
```

The runtime sees one composition at a time. A host renders them in order and assembles the deck.

## Surface artifacts

Each composition renders on HTML, Markdown, text, Slack Block Kit, and SVG. The markdown and text surfaces are the headline claim: a composition authored once degrades to a few lines of terminal output without any work from the author.

### Title slide

```markdown
# Title slide

## 01 · Primitives

_Reference pack_

## One composition, every surface.

The same spec renders as HTML, markdown, text, Slack, and SVG.
```

```text
TITLE SLIDE

01 · Primitives

Reference pack
One composition, every surface.
The same spec renders as HTML, markdown, text, Slack, and SVG.
```


### Split layout

```markdown
# Split layout

## 02 · Grammar

## Primitive pack

Vocabulary, renderers, and validation in one value.

### What a pack declares

- Primitives
- Surfaces
- Theme bound
```

```text
SPLIT LAYOUT

02 · Grammar

Primitive pack
Vocabulary, renderers, and validation in one value.

What a pack declares
- Primitives
- Surfaces
- Theme bound
```


### Surface cards

```markdown
# Surface cards

## 03 · Surfaces

## Six render targets.

React, HTML, SVG, Slack, Markdown, and plain text.

### React

Component tree; hosts mount it.

### HTML

Self-contained envelope with stylesheet.

### SVG

The same tree and stylesheet, handed to a rasterizer.

### Slack

Block Kit blocks with fallback text.

### Markdown

GitHub-flavored, readable in terminals.

### Text

80-column output for logging and alerts.
```

```text
SURFACE CARDS

03 · Surfaces

Six render targets.
React, HTML, SVG, Slack, Markdown, and plain text.

React
Component tree; hosts mount it.

HTML
Self-contained envelope with stylesheet.

SVG
The same tree and stylesheet, handed to a rasterizer.

Slack
Block Kit blocks with fallback text.

Markdown
GitHub-flavored, readable in terminals.

Text
80-column output for logging and alerts.
```


### Code block

```markdown
# Code block

## 04 · Contract

## The composition contract.

### Composition

```ts
const spec: Composition = {
  type: "view",
  title: "My view",
  body: [node],
};
```
```

```text
CODE BLOCK

04 · Contract

The composition contract.

Composition
const spec: Composition = {
  type: "view",
  title: "My view",
  body: [node],
};
```


### Flow diagram

```markdown
# Flow diagram

## 05 · Dispatch

## How a composition renders.

### Render pipeline

Composition -> Runtime -> Dispatcher -> Primitive -> Surface

### Host

Supplies composition, owns data and routing.

### Isomer

Owns dispatch, validation, and rendering.
```

```text
FLOW DIAGRAM

05 · Dispatch

How a composition renders.

Render pipeline
Composition -> Runtime -> Dispatcher -> Primitive -> Surface

Host: Supplies composition, owns data and routing.
Isomer: Owns dispatch, validation, and rendering.
```


## Getting a PNG

The `svg` surface returns `{ element, css, width, height }` — the React tree, the pack's stylesheet with `light-dark(…)` already resolved to the render's scheme, and the viewport it was measured for. It does not return an image: rasterizing is a separate capability a host opts into.
`@elastic/isomer-image-takumi` is that capability for this repo:
```ts
import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';

const takumi = createTakumiImageBackend({ fonts });
const png = await takumi.png(runtime.surfaces.svg.render(composition));
```

`fonts` is the host's, and it is not optional in practice — an unregistered family falls back to the backend's built-in face, so an unfonted render is visibly not this pack. [Fonts on the image surface](/pr-preview/pr-1/slides/styling#fonts-on-the-image-surface) covers which families and weights to register; `src/examples/deck/fonts.ts` is the worked version, deriving the weight set from the theme.
The five `.png` files are written by the same test that writes the other four surfaces' artifacts, with one difference: `toMatchFileSnapshot` is text-only, so the PNG case hand-rolls its own comparison, and that comparison is CI-only. A local run always rewrites the artifact — a takumi or font bump would otherwise fail every PNG case on the bump alone, not on a real regression — so `git diff` on the five files is the review step. Under `CI`, a missing artifact fails instead of being written, and byte equality is asserted against the committed artifact. CI runs Ubuntu only, so this verifies same-input determinism on linux-x64; cross-platform stability (darwin-arm64 producing the same bytes) is an operating assumption at a pinned `@takumi-rs/core` and a fixed font set, not independently verified here — see `@elastic/isomer-image-takumi`'s [Determinism](/pr-preview/pr-1/image-takumi#determinism) section.

## What this demonstrates

The five compositions together exercise every primitive at least once:
- `slideTitle`, `slideCardGroup` — the frame example and the cards slide
- `slideSplit`, `slideStack`, `slideBulletList` — the split layout slide
- `slideCode` — the code block slide
- `slideFlow`, `slideTerritoryGroup` — the flow diagram slide