---
type: Concept
title: Composition editor
description: "#/compose edits one whole Composition in Monaco beside every surface, and loads and shares it by URL like the TypeScript Playground, holding linked JSX until the reader runs it."
resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/dev/compose_view.tsx
tags: [isomer, studio]
status: stable
stale_after: 2027-04-20
sources:
  - id: view
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/dev/compose_view.tsx
    title: ComposeView
  - id: link
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/compose_link.ts
    title: Compose links
  - id: storage
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/src/model/compose_storage.ts
    title: Drafts and trusted sources
---

# Definition

The nav's **Composition** item, above Gallery, opens `#/compose` in Workbench mode. It edits a whole `Composition`, root fields included, as JSX (`<Composition title="…">`, printed through `printCompositionJsx`'s `root` option) or JSON checked against the runtime's authoring schema. The config's `compose` and `previewExample` apply only when an example seeds a draft, and the Studio's theme is dropped from it; a draft with no `theme` previews in the Studio's color mode without writing one.[^view]

The query names what to load: `code` (UTF-8, raw deflate through `CompressionStream`, then base64url), `src` (an `https:` or same-origin URL, fetched without credentials, 1 MB and 10 s caps), `lang` (`jsx` or `json`; else from `src`'s extension or the source's first character), and `example=<type>/<index>`. A bare `#/compose` restores the last draft from `localStorage`, else composes the first featured primitive's first example. As the draft changes, the editor rewrites the hash to `?code=…&lang=…` with `history.replaceState`, so reload, bookmarks and the address bar share it; it ignores a route equal to what it wrote, and loads anything else. Links past 8,000 characters warn on copy, and a `code` payload stops inflating past 1 MB. The Studio's composer params follow the route when it changes and then what the composer wrote, so a composer remounted after Home reloads the latest draft.[^link]

JSON from a link is data and renders at once. JSX from a link is held: the preview is replaced by a **Run this code** prompt and the status reads Not run, because compiled JSX runs in the page and, under `dev`, can reach the server. Source this tab wrote or ran is trusted by fingerprint in `sessionStorage`, so reloading one's own draft or the Workbench's **Open in the composition editor** handoff runs at once; only trusted source is saved as the draft.[^storage]

Related: [config contract](/studio/concepts/config-contract.md).

[^view]: ComposeView
[^link]: Compose links
[^storage]: Drafts and trusted sources
