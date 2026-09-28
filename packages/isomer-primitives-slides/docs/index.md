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
| [Builds](builds.md) | Revealing a slide one part per click, and driving builds from a host |
| [Worked example](example.md) | The eleven example compositions, their artifacts, and how to get a PNG |

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

Forty primitives, grouped as `slidePrimitiveGroups` in `src/pack_authoring.ts` groups them. Each description is the primitive's `purpose` from its `catalog.ts`.

### Slide structure

| Type | Purpose |
| --- | --- |
| `slideFrame` | Hold one 16:9 slide: its content top to bottom and a footer naming the deck, the section, and its address. Required by the document. |
| `slideHeading` | State what a content slide proves, as a one-line claim with an optional supporting sentence. |
| `slideStatement` | Land one claim the audience should remember, set large on a slide of its own. |
| `slideQuote` | Let a customer, a colleague, or a document make the point in their own words, with the source named. |
| `slideTitle` | Introduce the deck’s subject by name, with its promise and, optionally, a diagram of what it does. |
| `slideSection` | Tell the audience a new part of the deck is starting, and what it will cover. |
| `slideAgenda` | Show the audience every part of the talk and which one they are in, so they know how far along it is. |
| `slideClosing` | Send the audience away knowing where to go next: a few addresses, and what to read first for each goal. |
| `slideSource` | Tell the audience where the numbers or claims on a slide come from, without taking attention from them. |

### Layout

| Type | Purpose |
| --- | --- |
| `slideSplit` | Set two things side by side so the reader compares them: two owners, a before and after, or an input and what it becomes. |
| `slideStack` | Keep several nodes together as one block, one above the next, where a slot takes a single node. |
| `slideWindow` | Show the reader where something appears, such as a terminal, a browser tab, a chat, or a Slack channel, by framing slide content in that app’s title bar. |

### Text

| Type | Purpose |
| --- | --- |
| `slideList` | Give the audience a handful of short facts to scan, each optionally keyed by a short term. |
| `slideBulletList` | Give the audience a few short, unordered points, marked as neutral, done, or left out. |
| `slideDefinitions` | Teach the audience a few terms they need before the rest of the talk makes sense. |
| `slideColumns` | Lay two to four parallel options side by side so the audience can weigh them against each other. |
| `slideRoadmap` | Show what is done, what comes next, and what comes after, so the audience knows where the work stands. |

### Diagrams

| Type | Purpose |
| --- | --- |
| `slideTimeline` | Show how a need or situation changed over dated points, leading up to the one that matters now. |
| `slidePipeline` | Walk the audience through the ordered steps of one process, from what goes in to what comes out. |
| `slideSequence` | Show who says what to whom, in order, so the audience can follow a conversation between systems or people step by step. |
| `slideLanes` | Contrast two different routes to the same destination, so the audience sees where they differ and where they meet. |
| `slideGraph` | Define a small vocabulary and show how its terms relate, so the audience can hold the whole model at once. |
| `slideFanout` | Show one thing going to several destinations at once, and what each one does with it. |
| `slideTree` | Show what is inside a folder and what each file is for, so the audience can find their way around it. |
| `slideLayers` | Show how a system stacks, layer on layer, and who owns each layer, so the audience knows where a concern lives. |
| `slideTerritoryGroup` | Show who owns what, so the audience knows which side is responsible for each part. |
| `slideQuadrant` | Sort a handful of things by two qualities at once, so the audience sees which group each one falls in. |

### Numbers

| Type | Purpose |
| --- | --- |
| `slideStat` | Land one number that proves the slide, with the sentence that says what it means. |
| `slideStats` | Let the audience compare two to four numbers at a glance, each with a label and one line of context. |
| `slideDelta` | Show how far one number moved between two points, and what that change means. |
| `slideBars` | Let the audience compare the size of several amounts of the same kind, and see which one stands out. |
| `slideMatrix` | Let the audience see at a glance which options support which capabilities, and where support is only partial. |
| `slideTable` | Let the reader compare several items across the same attributes, reading across a row or down a column. |

### Code and renders

| Type | Purpose |
| --- | --- |
| `slideCode` | Show the reader real source, with the lines that matter marked, or trace one value from the file that sets it to the file that reads it. |
| `slideDiff` | Show the reader exactly what a change did to a piece of source: which lines it added, which it removed, and what stayed. |
| `slideCommand` | Give the audience one shell command they can type or copy and run themselves. |
| `slideTranscript` | Let the reader follow a short exchange between a person, a model, and the program hosting it, turn by turn. |
| `slideRender` | Show the audience real output: another slide or composition exactly as one surface renders it. |
| `slideAnnotatedRender` | Walk the audience through the parts of a real render, with numbered pins on it and a legend that says what each part does. |
| `slideRenderGrid` | Prove one composition works everywhere by showing it as several surfaces render it, side by side. |

## What a pack must export, and what this one adds for its hosts

A pack is the first group. A host cannot register it with a runtime without them:

- `slidesPack`, the `definePrimitivePack` result a runtime loads.
- `slideDeckFrame`, the document, with `SLIDE_WIDTH` and `SLIDE_HEIGHT`.
- `slideDeckPrimitives` and `slidePrimitiveTypes`, the primitive list and its `type` strings.
- The node types: `SlideFrameNode`, `SlideContentNode`, and one per primitive.

The second group is what this pack adds for its own hosts, none of which the runtime needs:

- `slideJsx`, the primitives as JSX components.
- `slideFontFaces`, the faces an image backend needs, which a host maps to font files.
- `resolveSlideRenders`, which fills a `slideRender`'s `composition` from a deck by name.
- `showSlideBuild` and `slideBuilds`, with `SLIDE_BUILDS` and `slideBuildParts`, for [builds](builds.md).
- `SLIDE_COPY`, the id a host requests for [copy buttons](copy.md) on its commands.
- `slideStylesheet`, `StandaloneSlideNode`, and `SlideFrameView`, for a host that mounts the React tree itself.
- `slideOverflow` and `slideOverlaps`, for a host that checks a slide fits.
- `slideAuthoringNotes`, `buildSlidesAuthoringPrompt`, `slidesAuthoringGuide`, `slidesAuthoringRules`, and `slidePrimitiveGroups`, for a host that prompts a model.

A pack that copies this one keeps the first group and takes from the second only what its hosts need.

## Authoring with an agent

`buildSlidesAuthoringPrompt()` returns the prompt a model needs to write slides with this pack: the guide (`slidesAuthoringGuide`), the rules (`slidesAuthoringRules`), every primitive's catalog entry, and the authoring JSON Schema. A host that composes other packs passes its runtime's `getAuthoringContext()` `schema` and `primitives` instead.

The pack indexes its primitives under `slidePrimitiveGroups` (structure, layout, text, diagrams, numbers, code and renders), which a runtime's `getAuthoringContext().groups` carries to a host that serves an index and lookups instead of the whole prompt, as `@elastic/isomer-agent-tools` does.

`slideOverflow(box)` reads a slide as an image backend lays it out — the takumi backend's `measure` — and returns how far its content runs past the frame body on each side, or `undefined` when it fits. The contents of a scaled embedded render are not searched, since the render's panel clips them; an unscaled text surface cut off by its panel still counts. `slideOverlaps(box)` reads the same layout for body nodes drawn over each other, as when the slide is too full and a node is squeezed until its text runs into the next one; it compares what each node paints, its text and its bare shapes, rather than its boxes.
