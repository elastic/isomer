---
type: Concept
title: Decks
description: Committed decks in decks/, frozen v1 originals, and the Studio's Decks app that presents them with builds.
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/decks/catalog.ts
tags: [isomer, slides, studio]
status: stable
stale_after: 2027-04-15
sources:
  - id: catalog
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/decks/catalog.ts
    title: deckCatalog
  - id: app
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/studio/decks_app.tsx
    title: Decks app
  - id: docs
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-primitives-slides/docs/decks.md
    title: Decks
---

# Definition

The slides pack commits whole decks as `decks/<id>.json`, each `{ id, title, slides, updatedAt }` with one `slideFrame` composition per slide and no `theme`. A link to another slide in the deck is `?slide=<index from 0>`. `decks/v1/<id>.json` holds the same deck as authored against v0.2.0, byte for byte and frozen; every frozen deck has a migrated copy with as many slides, and a newer deck needs no frozen original. `deckCatalog` in `decks/catalog.ts` lists the decks the app shows, each `{ id, title, load }`, where `load` dynamically imports the file. `src/decks.test.ts` fails unless every migrated slide validates, renders on every surface, and passes the fit check, and unless file names, ids, catalog entries and titles agree.[^catalog][^docs]

The slides Studio's Decks app lists `deckCatalog` as its `pages`, so each deck is a nav row. It routes `#/app/decks/<id>/<n>/<step>`, `n` counting from 1: no `<id>` shows the deck list, no `<n>` the deck's thumbnails, and otherwise one slide, rendered through `Preview` with `heading={false}`, the `SLIDE_BUILDS` enhancement, and `showSlideBuild` in `onCommit`. Output switches the stage between the slide and each of the app's `surfaces` through `Surface` with `heading={false}`; builds step only on the slide, and the other views move a slide at a time. A click on the slide (not on a link, a button, or the end of a text selection), Right arrow, Space, Down arrow and Page Down go forward; Left arrow, Shift + Space, Up arrow and Page Up go back; Home and End jump to the ends; F toggles Present; a `?slide=` link opens its slide; and Present shows the slide full screen at a zoom that fills it, with Previous, Next and Stop on hover. Download PDF, on the thumbnails and the stage, writes `<id>.pdf` through `renderPdf`, and is disabled without one. The slides config's `imageFonts` is `studio/image_fonts.ts`, which re-exports `slideFonts`. Thumbnails are `inert`. An unknown slide opens the first, and a step past the last build shows the slide built.[^app]

Related: [pack](/slides/concepts/pack.md), [Studio config contract](/studio/concepts/config-contract.md).

[^catalog]: deckCatalog

[^app]: Decks app

[^docs]: Decks
