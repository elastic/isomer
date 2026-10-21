# Frame

A frame is a document: the picture-frame a `snapshot` render sits inside, plus the geometry that sizes it and the palette it draws with. Where a [pack](packs.md) is additive vocabulary, a frame is exclusive — a render produces one document, a 760-pixel card **or** a fixed 1920×1080 slide, and a render names the one it wants.

The SDK owns the type; a theme package or a pack supplies instances; this package is where a host registers them and picks one per render. See [the frame contract](../../isomer-sdk/docs/frame.md) for `wrap`, `FrameHeader`, and `FrameViewport`.

```ts
const cardRuntime = createIsomerRuntime({
  packs: [componentsPack, chartsPack],
  frames: { card: cardFrame },
});

cardRuntime.surfaces.snapshot.render(composition);
cardRuntime.surfaces.snapshot.render(composition, { frame: 'card' });
```

The key is the frame's name: a render that names none uses the default, and `{ frame: 'card' }` is the same string the host registered.

Frame is a runtime input, not a pack asset. Nothing about a primitive decides the document, so a host reframes a vocabulary by passing a different frame rather than by forking a pack. What a runtime cannot do is hold frames whose palettes are unrelated — see the theme bound below.

## Frame decides the `snapshot` surface's existence

Supply no `frames` and `surfaces.snapshot` is `undefined`, and the type says so: `createIsomerRuntime` is overloaded so a call with `frames` returns a runtime whose `snapshot` is present, and a call without returns one whose `snapshot` is `undefined`.

```ts
const noImages = createIsomerRuntime({ packs: [componentsPack] });
noImages.surfaces.snapshot; // undefined
noImages.getCapabilities().surfaces; // ['react','html','text','markdown','slack']
```

An empty `frames` map throws `EMPTY_FRAMES` rather than building a runtime typed as having a `snapshot` surface it lacks; omit the option instead. With exactly one frame, that frame is the default and `defaultFrame` is optional. With two or more, `defaultFrame` is required, and naming one the runtime does not hold is an error that lists the names it does.

## What a frame owns

| Responsibility | Effect |
| --- | --- |
| `defaultWidth` | The width a render uses unless the caller passes one |
| `sizing` | `fixed` (the default) or `content`: whether the height is `estimateHeight`'s or the laid-out body's. See [Sizing to content](#sizing-to-content) |
| `estimateHeight` | The height a render uses unless the caller passes one; under `sizing: 'content'`, only an estimate. Calling `estimateSnapshotHeight` is what reads `metrics.snapshotHeight` |
| `theme` | A palette per mode; an image has no media queries, so it commits to one |
| `validateBody` | What this document requires of a body — the slide rule of exactly one `slideFrame` |
| `wrap` | The surround drawn around the dispatched body |

The body itself is dispatched generically, and the frame is handed the composition's title, subtitle, and theme with the body nodes withheld — a frame that could read the nodes could branch on a pack's node types, which is exactly the knowledge this split keeps out of it.

A missing `metrics.snapshotHeight` is reported by the `snapshot` surface, on the render whose `estimateHeight` calls `estimateSnapshotHeight` under a `fixed` frame. A frame that returns a constant, or one that sizes to content, leaves that list empty. `validate` covers duplicate ids and empty surfaces, so a runtime holding a measuring frame and a fixed one warns only for the render that measured. See [Surfaces](surfaces.md#a-missing-snapshotheight).

## Rendering with one

```ts
const { element, html, css, width, height } = runtime.surfaces.snapshot.render(composition, { theme: 'light' });
```

The result carries the viewport the page was laid out for, so a rasterizing host reads `width` and `height` from it. An unknown frame name throws.

`render` validates, resolves the frame, checks the frame's own body rule, resolves geometry, then hands the frame and the dispatcher to `BoundFrame.render`. The body-rule check throws rather than returning a result: `render` already validated, so this is the backstop for a composition that arrived another way, or one validated under a different frame than it is now drawn in.

## Sizing to content

A fixed frame's height is whatever `estimateHeight` returns, and for a card that means summing each node's `metrics.snapshotHeight` — a pixel height per primitive that a pack has to keep in step with its styles, and that is 0 for any primitive declaring none. A frame for message-style content, such as tables, fields, and markdown of any length, can instead declare `sizing: 'content'`:

```tsx
const messageFrame: Frame<CardTheme> = {
  defaultWidth: 760,
  theme,
  sizing: 'content',
  // A floor, not a promise: the image backend measures the real height.
  estimateHeight: () => 120,
  wrap: (header, body, { width, theme }) => (
    <div style={{ width, background: theme.background }}>{body}</div>
  ),
};
```

A render under it returns `heightMode: 'content'` alongside `height`, and an image backend that honors it lays the markup out at `width` and sizes the output to the root: `@elastic/isomer-image-takumi` does so for PNG, SVG, and PDF, in its own layout pass (see [Sizing to content](../../isomer-image-takumi/docs/index.md#sizing-to-content)). `height` is still the frame's estimate, so a synchronous caller, a browser preview, or a backend that ignores `heightMode` still has a viewport. Passing `height` to a render overrides both: the result is `heightMode: 'fixed'` at that height.

What is measured is the root `wrap` returns, so a content frame should not pin its root to `viewport.height` — a root fixed at the estimate measures as the estimate — and should not size it by percentage, which has no viewport height to resolve against. `renderPages` under a content frame still gives every page one size: the backend measures each page and uses the tallest.

`metrics.snapshotHeight` stays supported, and under a content frame it becomes optional. Missing-height warnings are not reported there, since the estimate sizes nothing. Declare it still when:

- a fixed frame sums node heights, since it is the only height that frame has;
- a content frame's `estimateHeight` wants a closer estimate for a synchronous caller, such as a browser preview sized before any backend runs, or a host that reserves space for the image;
- the image goes through a backend that does not measure, which draws at the estimate.

## A runtime is homogeneous in its theme

`IsomerRuntimeOptions.frames` is `FrameMap<TTheme>`, and a pack declares the palette its frames must supply through a phantom marker on `PrimitivePack<TTheme>`. `TTheme` is inferred from the packs first, so a mismatch is reported against `frames` and never names the pack that set the bound — pairing charts with a slide frame reads as `Frame<SlideFrameTheme>` is not assignable to `Frame<SvgRenderTheme>`.

A pack that genuinely reads no theme stays at `PrimitivePack<unknown>`, which bare `PrimitivePack` also means. A pack that needs a frame to carry tokens names them as the type argument, `definePrimitivePack<CoreTokens>(input)`. The runtime's own storage slots are `AnyPrimitivePack`.

Packs wanting different palettes belong in different runtimes. A composition is routed to the runtime that owns its node types before anything else happens to it.

## Next

[Surfaces](surfaces.md) · [The frame contract](../../isomer-sdk/docs/frame.md)
