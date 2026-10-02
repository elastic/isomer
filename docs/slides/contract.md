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

## `definePrimitivePack<SlideFrameTheme>`

`src/pack.ts` calls `definePrimitivePack<SlideFrameTheme>` with `styleAdapter: createDistillateStyleAdapter(slideDistillery)`. The theme is the **declared** lower bound — what any runtime holding this pack must supply to its frames. The style adapter is this pack's CSS, which a runtime combines with every other pack's, and which the `svg` surface emits alongside the tree. The bound is stated once, as the type argument.

## Surface declaration

The pack declares no `surfaces`. `svg` is not declarable — every pack reaches it through its `react` renderers.

Every primitive has a native `slack` renderer, and `src/registry.test.ts` fails when one does not. The containers (`slideFrame`, `slideSplit`, `slideStack`, `slideWindow`, `slideTitle` for its aside, and `slideAnnotatedRender` for its render) render each child through `scope.renderSlack`, so the dispatcher decides per child: a foreign node without a `slack` renderer falls back through its Markdown alone. A container without a `slack` renderer would send its whole subtree through the Markdown fallback, and a native renderer below it would never run.

## The registry

`src/registry.ts` is hand-maintained. It exports `slideDeckPrimitives` (the array) and `slidePrimitiveTypes` (the type strings). Keep it alphabetically sorted.
