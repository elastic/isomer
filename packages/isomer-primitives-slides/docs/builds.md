# Builds

A build reveals a slide one part per click. Order comes from the slide's structure, not from a field: the parts of an ordered primitive show in reading order, and everything else shows from the first click. Slides stay stateless, and the host owns the click counter.

## What builds

| Primitive | One click reveals |
| --- | --- |
| `slideBulletList` | an item |
| `slideList` | a row |
| `slidePipeline` | a step; the rail and the `start` chip show from the first click, the `end` chip comes with the last step, and in spans mode a span's bracket and caption with the step it ends on |
| `slideSequence` | a message; the actors and their lifelines show from the first click |
| `slideTimeline` | an item; the rail shows from the first click |
| `slideTranscript` | a turn |

A slide embedded with `slideRender`, `slideRenderGrid`, or `slideAnnotatedRender` is a picture of a finished slide and never builds. Hidden parts keep their layout box (`visibility: hidden`), so nothing moves when one appears.

Only the React and HTML surfaces build. The image, text, Markdown, and Slack surfaces draw the finished slide.

## Driving builds from a host

Render with `slideBuildsEnhancement`, count the clicks with `slideBuilds`, and apply a step with `showSlideBuild` after each render commits:

```tsx
import {
  showSlideBuild,
  slideBuilds,
  slideBuildsEnhancement,
} from '@elastic/isomer-primitives-slides';

const element = runtime.surfaces.react.render(composition, {
  enhancements: [slideBuildsEnhancement],
});
const clicks = slideBuilds(composition, runtime.primitives);
// After the render commits into `root`:
showSlideBuild(root, composition, step, runtime.primitives);
```

On the `html` surface, request it by id instead: `runtime.surfaces.html.render(composition, { enhancements: [SLIDE_BUILDS] })`. A React host collects the pack's CSS with a Distillate live collection, as [embedding](../../isomer-runtime/docs/embedding.md) shows.

`slideBuilds(composition, primitives)` is the number of clicks the slide takes. `showSlideBuild(root, composition, step, primitives)` shows the first `step` parts and hides the rest; call it again with a lower step to go back. It first shows anything an earlier call hid, so it is safe after React reuses elements across slides. A node whose parts it cannot find stays whole. Both walk only this pack's primitives unless given `primitives`, which misses a buildable node inside another pack's container. Pass the full inventory, such as `runtime.primitives`, to both: given different inventories, the count can stop before the parts `showSlideBuild` hides are shown.

The enhancement adds only [node anchors](../../isomer-sdk/docs/rendering.md#node-anchors), which is how `showSlideBuild` finds each node through `findNodeElementPairs`. It ships no script. A render without the enhancement, or with no ordered primitive, carries no anchors.

## Making a primitive build

Add a `build.ts` beside the primitive that exports a `SlideBuild`: `count(node)`, and `units(owner, node)`, which returns each part's elements under the primitive's anchored root. Find elements by tag and position, never by class name, since class names are minified. Then add it to `buildsByType` in `src/builds/builds.ts`.
