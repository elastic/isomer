# Pack contract

## `definePrimitive` — the local binding

`src/render/context.ts` declares the pack's `PackTypes` once, and `src/primitives/define.ts` binds the SDK's `definePrimitive` to it so each primitive names only `TNode`:

```ts
// src/render/context.ts
export interface SlidePackTypes extends DefaultPackTypes {
  theme: SlideFrameTheme;
  context: SlideRenderContext;
}

// src/primitives/define.ts
export const definePrimitive = definePrimitiveFor<SlidePackTypes>();
```

- `theme` — the palette lower bound this pack places on a frame.
- `context` — the Distillate class-name context the React renderers receive. `SlideReactEnv` is `SurfaceMap<SlidePackTypes>['react']['env']`, the one `env` type every `react` renderer in the pack is written against.

Everything else stays at the SDK default. A new pack declares its own `PackTypes` the same way.

## `themeBound<SlideFrameTheme>()`

`src/pack.ts` passes `theme: themeBound<SlideFrameTheme>()` and `styleAdapter: createDistillateHtmlStyleAdapter(slideDistillery)` to `definePrimitivePack`. The theme is the **declared** lower bound — what any runtime holding this pack must supply to its frames. The style adapter is this pack's CSS, which a runtime combines with every other pack's, and which the `svg` surface emits alongside the tree. Do not annotate the export as `PrimitivePack<SlideFrameTheme>`; derive it.

## Surface declaration

The pack declares no `surfaces`, because not every primitive has a `slack` renderer. `svg` is not declarable — every pack reaches it through its `react` renderers.

On Slack, the containers (`slideFrame`, `slideSplit`, `slideStack`, `slideWindow`, `slideTitle` for its aside, and `slideRender`, `slideRenderGrid`, and `slideAnnotatedRender` for their embedded composition) render each child through `scope.renderSlack`, so the dispatcher decides per child. These leaves have native renderers: `slideClosing`, `slideCode`, `slideCommand`, `slideDiff`, `slideFanout`, `slideHeading`, `slideQuote`, `slideSection`, `slideSource`, `slideStat`, `slideStatement`, `slideStats`, `slideTable`, and `slideTranscript`. `slideTable`, for one, keeps row headers bold in a `table` block. Every other leaf falls back through its markdown. A container without a `slack` renderer would send its whole subtree through the markdown fallback, and a native renderer below it would never run.

## The registry

`src/registry.ts` is hand-maintained. It exports `slideDeckPrimitives` (the array) and `slidePrimitiveTypes` (the type strings). Keep it alphabetically sorted.
