# Isomer deck

The Isomer deck, as a composition per slide. Each file under `src/slides/` is one `.tsx` composition authored with the slides pack's `slideJsx`, re-exported by `src/shim.ts` with `Composition` as `Slide`, and rendered on every surface by the slides pack through the runtime in `src/runtime.ts`. `src/deck.ts` orders the slides, links each section divider to the slides that follow it, and fills in every `slideRender` that names another slide.

## Run it

```sh
pnpm deck:dev
pnpm deck:build
```

`DECK_BASE=./` keeps every asset relative, so the build works under the docs site's `/isomer/deck/` (see `vite.config.ts`). The docs workflow builds the deck this way and copies `dist/` to `/deck/` on the Pages site.

## PNGs

`vite/png_plugin.ts` draws each slide's PNG in Node, because takumi is a native addon: on request under `vite dev`, and as emitted assets when the deck is built. `src/png.ts` is the module it loads, and `src/fonts.ts` maps the pack's `slideFontFaces` to `@fontsource` files for takumi.

## Exports

`./viewer` and `./viewer.css` are the deck's only exports. The viewer (`src/viewer/`) shows any `DeckSlide[]` on every surface, and the slides studio reuses it for its own decks. `runtime.ts`, `fonts.ts`, and `shim.ts` stay internal.

## Tests

| File                           | Proves                                                                                                                                                                                                                                                                                   |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/deck.test.ts`             | Every slide validates and renders on every surface, section dividers list and link the slides that follow them, each slide opens with one heading in Markdown and Slack, the JSX the shim prints parses back to the same composition, and the shim re-exports every `slideJsx` component |
| `src/fit.test.ts`              | Every slide fits its frame under takumi's layout, with no node past the body and none drawn over another                                                                                                                                                                                 |
| `src/builds.test.ts`           | Every part of every building node is found in the html surface's output, so builds step through the slides that rely on order                                                                                                                                                            |
| `src/style_collection.test.ts` | One React render collects the same CSS the html surface emits for a slide, with and without builds                                                                                                                                                                                       |
| `src/viewer/route.test.ts`     | The viewer's URL reads and writes slide, build, and theme                                                                                                                                                                                                                                |
