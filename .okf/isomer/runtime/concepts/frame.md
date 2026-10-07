---
type: Concept
title: Frame
description: The document an image is drawn as. Exclusive, one per render, supplied by the host; decides whether svg exists.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
tags: [isomer, runtime, frame]
status: stable
stale_after: 2027-03-18
sources:
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/docs/frame.md
    title: Frame
  - id: runtime
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/assemble/runtime.ts
    title: Frame map and default resolution
  - id: svg
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-runtime/src/surfaces/svg.ts
    title: svg surface
---

# Definition

A frame is the document an `svg` render is drawn inside. Vocabulary and document are independent: packs are additive, frames are exclusive. The host names the frame (`slide`, `card`) when constructing the runtime, and a render that wants this document asks for `{ frame: 'slide' }`. Omitting `frames` leaves `surfaces.svg` `undefined`, and `createIsomerRuntime`'s overloads type it so; an empty `frames` map throws `EMPTY_FRAMES`, and `defaultFrame` without `frames` throws `UNKNOWN_FRAME`. One frame is the default; past one, `defaultFrame` is required, else `AMBIGUOUS_FRAME`, and a name the runtime does not hold is `UNKNOWN_FRAME`, from construction and from `render`, `renderPages`, and `renderNode` alike. A render validates the composition, then checks the frame's own `validateBody` rule and throws `INVALID_FRAME_BODY`. An `svg` render whose `estimateHeight` calls `estimateSvgHeight` reports each node visible on `svg` with no `metrics.svgHeight` on that result's `warnings`; a frame that returns a constant leaves the list empty, and `validate` covers duplicate ids and empty surfaces. The map is `FrameMap<TTheme>`, with `TTheme` inferred from the packs first, so a palette mismatch is reported against `frames`.[^docs][^runtime][^svg]

Related: [surfaces](/runtime/concepts/surfaces.md), [runtime](/runtime/concepts/runtime.md), [slide document](/slides/concepts/document.md).

[^docs]: Frame

[^runtime]: Frame map and default resolution

[^svg]: svg surface
