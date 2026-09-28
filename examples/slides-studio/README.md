# Isomer slides studio

A local studio where an agent writes an Isomer slide deck over MCP while you watch it render. Private and dev-only: it never publishes or builds.

```sh
pnpm studio:dev
```

Open `http://localhost:5178` for the instructions, then point an MCP client at it. For Claude Code:

```sh
claude mcp add --transport http isomer-slides http://localhost:5178/mcp
```

Ask for a deck ("Make a six-slide deck about our checkout reliability work"). The agent is told to share the deck's page, and the landing page lists every deck.

## Pages

| Path                  | Shows                                                                                                                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                   | How to connect an agent and ask for a deck, and every deck, newest first, with its title slide and a Delete button. A deck created while this page is open opens on its own                                                                                   |
| `/decks/<id>`         | Every slide in the deck as a thumbnail, updating live. A new or rewritten slide is marked and scrolled to while "Follow new slides" is on; a slide that no longer validates is marked "Needs fixing", and one whose content leaves its frame body "Overflows" |
| `/decks/<id>/present` | The deck viewer, on every surface, with any validation errors above the stage. **Source** (or `s`) opens the slide as stored beside the stage, as JSX or JSON                                                                                                 |

`/?deck=<id>` links from before these pages redirect to the viewer.

## What the agent gets

- Four `@elastic/isomer-agent-tools` tools over the slides runtime, registered on the MCP server by `server/adapters/mcp.ts`: `isomer_authoring_guide` (the slides pack's guide, rules, and an index of its primitives by group), `isomer_describe_primitives` (each picked primitive's entry and JSON Schema), `isomer_validate`, and `isomer_render`, which includes `png`. The view tools, `isomer_list_views` and `isomer_request_view`, appear only when a runtime registers views, and the studio registers none.
- Deck tools: `deck_create`, `deck_list`, `deck_get`, `deck_set_slide`, `deck_insert_slide`, `deck_remove_slide`, `deck_move_slide`, and `deck_render_slide`. A slide is validated before it is stored, and an invalid one comes back with its errors. `deck_render_slide` returns a PNG so the agent can check its own work, with a note when content runs past the slide's body or body nodes are drawn over each other, from takumi's layout.

In a `slideRender`, `slide` names another slide in the same deck by index, as a string (`"0"`); the studio fills in its composition.

## Where things live

| Path                                     | Holds                                                                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `common/runtime.ts`                      | The studio's runtime, built from the slides pack, shared by the server and the pages                                 |
| `common/events.ts`                       | The event a deck's stream ends with once the deck is removed                                                         |
| `server/app.ts`                          | Routes: `/mcp`, `/api/decks`, server-sent events, and `/png/<deck>/<index>.<theme>.png`                              |
| `server/state.ts`                        | The store, the takumi backend, and open MCP sessions, on one `globalThis` singleton                                  |
| `server/render.ts`                       | The `png` and `layoutOf` renderers the host takes and the PNG route serves, built once over one backend              |
| `server/fonts.ts`                        | The pack's `slideFontFaces` mapped to `@fontsource` files for takumi                                                 |
| `server/mcp.ts`                          | One MCP server and Streamable HTTP transport per session                                                             |
| `server/adapters/mcp.ts`                 | Registers agent tools, resources, and prompts on an MCP server; the part a host copies                               |
| `server/host/slides_host.ts`             | What an agent gets, for any transport: the slides pack's agent tools plus the deck tools                             |
| `server/host/deck_tools.ts`              | The deck tools                                                                                                       |
| `server/host/deck.ts`                    | The `Deck` and `DeckStore` types the host and the store share                                                        |
| `server/host/resolve.ts`                 | Fills each `slideRender` reference from the deck's own slides                                                        |
| `server/store.ts`                        | Decks in memory, mirrored to `.decks/<id>.json` through a temp file; a file that is not a deck is skipped at startup |
| `vite/studio_plugin.ts`                  | Serves the server modules from the dev server through `ssrLoadModule`                                                |
| `src/app.tsx`, `src/router.tsx`          | The three pages and a small history router                                                                           |
| `src/home.tsx`                           | The landing page: connection instructions and the deck list                                                          |
| `src/deck_page.tsx`, `src/thumbnail.tsx` | The live slide grid                                                                                                  |
| `src/present.tsx`                        | The deck viewer from `@elastic/isomer-deck/viewer`, fed live over server-sent events                                 |
| `src/slides.ts`                          | A stored deck as the viewer's `DeckSlide[]`, each with its JSX and JSON source                                       |

The studio builds its own runtime from the slides pack (`common/runtime.ts`) and takes only the viewer from `@elastic/isomer-deck`. Fonts are the host's job: `server/fonts.ts` maps the pack's `slideFontFaces` to `@fontsource` files for takumi.

`server/host/` takes its runtime, store, and renderers as options and imports no transport, app module, or Node built-in, which ESLint enforces, so it can become its own package once a second host needs it.

State lives on one `globalThis` singleton so decks and connected agents survive hot reloads. The MCP endpoint only answers `localhost`, `127.0.0.1`, or `[::1]` on the port it is served from, and refuses a request from any other origin.

Every slide the studio draws, in the viewer, the slide grid, and the deck list, goes through the viewer's `ShadowSlide`: the React surface in a shadow root holding only the CSS the html surface collects for that slide. `DELETE /api/decks/<id>` removes a deck and its file, and refuses a request from another origin.

An MCP session remembers the server code it was opened against. When that code changes under `pnpm studio:dev`, the session answers 404 and the client starts a new one, so an agent never validates against a stale schema.

## Read next

The [docs](https://elastic.github.io/isomer/) for what Isomer is, and the [Isomer deck](https://elastic.github.io/isomer/deck/), itself written with this pack.
