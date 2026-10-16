# Decks

The pack commits whole decks under `decks/`, and the slides Studio shows them in its Decks app: a deck's thumbnails, then one slide at a time, stepping through its [builds](builds.md).

## Layout

| Path                 | What it holds                                                    |
| -------------------- | ---------------------------------------------------------------- |
| `decks/<id>.json`    | A deck in the current vocabulary.                                |
| `decks/catalog.ts`   | `deckCatalog`, the decks the app lists, in order.                |
| `decks/v1/<id>.json` | The same deck as authored against v0.2.0, byte for byte. Frozen. |

A deck file is `{ id, title, slides, updatedAt }`. `id` matches the file name, `title` matches its catalog entry, and each of `slides` is one `Composition` whose body is one `slideFrame`. Slides carry no `theme`; the app gives each the Studio's. A link to another slide in the same deck, such as a `sectionSlide` entry's `href`, is `?slide=<index from 0>`, and the app opens that slide.

`v1/` is input for the migration tests and is never edited. Each frozen deck has a migrated copy with the same number of slides; a deck authored since needs no frozen original.

## Adding a deck

1. Write `decks/<id>.json` with `id` set to `<id>`.
2. Add `{ id, title, load: fromJson(() => import('./<id>.json')) }` to `deckCatalog`. Its title becomes a page under Decks in the Studio's nav.
3. Run `pnpm vitest run packages/isomer-primitives-slides/src/decks.test.ts`. It fails until every slide validates, renders on every surface, and fits its 1920 × 1080 frame.

## In the Studio

The app lives at `#/app/decks/<id>/<n>/<step>`, with `n` counting slides from 1 and `step` the builds shown. Without `<n>` it shows the deck's thumbnails, and without `<id>` the list of decks. An unknown slide opens the first, and a step past the slide's last build shows the slide built.

Above the slide, Output switches between the slide and each of the Studio's surfaces: HTML, Slack, Markdown, Text, Snapshot and, when the Studio rasterizes, PNG. Builds step only on the slide; the other views move a whole slide at a time.

| Input                            | Moves to                                          |
| -------------------------------- | ------------------------------------------------- |
| Click the slide, Right arrow     | the next build, then the next slide               |
| Space, Down arrow, Page Down     | the same, on the slide                            |
| Left arrow                       | the previous build, then the previous slide built |
| Shift + Space, Up arrow, Page Up | the same, on the slide                            |
| Home                             | the first slide                                   |
| End                              | the last slide, built                             |
| F                                | Present, or stop presenting                       |

A click on a link or a button, or one that ends a text selection, does not advance. Present shows the slide full screen, scaled to fill it; the same keys drive it, and its controls appear on hover. Thumbnails are inert, so their links are not tab stops.

Download PDF, on the thumbnails and the stage, writes the deck as `<id>.pdf`, a page per slide with every build shown, drawn in the pack's fonts through the config's `imageFonts`. It needs `isomer-studio dev`; a static site disables it.
