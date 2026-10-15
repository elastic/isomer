# Decks

The pack commits whole decks under `decks/`, and the slides Studio shows them in its Decks app: a deck's thumbnails, then one slide at a time, stepping through its [builds](builds.md).

## Layout

| Path                 | What it holds                                                    |
| -------------------- | ---------------------------------------------------------------- |
| `decks/<id>.json`    | A deck in the current vocabulary.                                |
| `decks/catalog.ts`   | `deckCatalog`, the decks the app lists, in order.                |
| `decks/v1/<id>.json` | The same deck as authored against v0.2.0, byte for byte. Frozen. |

A deck file is `{ id, title, slides, updatedAt }`. `id` matches the file name, `title` matches its catalog entry, and each of `slides` is one `Composition` whose body is one `slideFrame`. Slides carry no `theme`; the app gives each the Studio's.

`v1/` is input for the migration tests and is never edited. Each frozen deck has a migrated copy with the same number of slides.

## Adding a deck

1. Write `decks/<id>.json` with `id` set to `<id>`.
2. Add `{ id, title, load: fromJson(() => import('./<id>.json')) }` to `deckCatalog`. Its title becomes a page under Decks in the Studio's nav.
3. Run `pnpm vitest run packages/isomer-primitives-slides/src/decks.test.ts`. It fails until every slide validates, renders on every surface, and fits its 1920 × 1080 frame.

## In the Studio

The app lives at `#/app/decks/<id>/<n>/<step>`, with `n` counting slides from 1 and `step` the builds shown. Without `<n>` it shows the deck's thumbnails, and without `<id>` the list of decks. An unknown slide opens the first, and a step past the slide's last build shows the slide built.

| Key         | Moves to                                          |
| ----------- | ------------------------------------------------- |
| Right arrow | the next build, then the next slide               |
| Left arrow  | the previous build, then the previous slide built |
| Home        | the first slide                                   |
| End         | the last slide, built                             |

Present shows the slide full screen; the same keys drive it.
