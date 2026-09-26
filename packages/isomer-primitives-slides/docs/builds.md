# Builds

A build reveals a slide one part per click. Order comes from the slide's structure, not from a field: the parts of an ordered primitive show in reading order, and everything else shows from the first click. Slides stay stateless, and the host owns the click counter.

## What builds

| Primitive | One click reveals |
| --- | --- |
| `slideBulletList` | an item |
| `slideList` | an item |
| `slidePipeline` | a step; in spans mode, its connector and chip |
| `slideSequence` | a message |
| `slideTimeline` | an item |
| `slideTranscript` | a turn |

Rails, terminals, actors, lifelines, and span brackets stay visible. A slide embedded with `slideRender` or `slideRenderGrid` is a picture of a finished slide and never builds. Hidden parts keep their layout box (`visibility: hidden`), so nothing moves when one appears.

Only the React and HTML surfaces build. The image, text, Markdown, and Slack surfaces draw the finished slide.

## Driving builds from a host

Request the `slideBuilds` enhancement when rendering, count the clicks with `slideBuilds`, and apply a step with `showSlideBuild` after each render:

```ts
import { SLIDE_BUILDS, showSlideBuild, slideBuilds } from '@elastic/isomer-primitives-slides';

const collection = runtime.surfaces.html.createStyleCollection(composition, {
  enhancements: [SLIDE_BUILDS],
});
// Render with `collection.context`, then, before paint:
showSlideBuild(shadowRoot, composition, step, runtime.primitives);
```

`slideBuilds(composition)` is the number of clicks the slide takes. `showSlideBuild(root, composition, step)` shows the first `step` parts and hides the rest; call it again with a lower step to go back. It first shows anything an earlier call hid, so it is safe after React reuses elements across slides. A part it cannot find leaves its node whole.

The enhancement changes the output only by adding [node anchors](../../isomer-sdk/docs/rendering.md#node-anchors), which is how `showSlideBuild` finds each node. It ships no script. A render without the enhancement, or with no ordered primitive, carries no anchors.

The Isomer deck viewer (`docs/deck/src/viewer`) is the reference host: → reveals the next part before moving on, ← hides the last one, and the URL records a partly built slide as `?build=<n>`.

## Making a primitive build

Add a `build.ts` beside the primitive that exports a `SlideBuild`: `count(node)`, and `units(owner, node)`, which returns each part's elements under the primitive's anchored root. Find elements by tag and position, never by class name, since class names are minified. Then add it to `buildsByType` in `src/builds/builds.ts`. The builds tests check every example and every deck slide, so a primitive whose parts cannot be found fails there.
