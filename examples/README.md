# Examples

Private, runnable apps built on the packages. `pnpm-workspace.yaml` globs `examples/*`, so each directory here is a workspace member outside `packages/`: the publish, export, and license checks never see it, and CI builds only the deck.

| Example                           | Role                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [`deck`](deck/)                   | The Isomer deck: one `.tsx` composition per slide, rendered by the slides pack and copied to the docs site |
| [`slides-studio`](slides-studio/) | A dev-server-only app where an agent writes a slide deck over MCP while you watch                          |

## Adding an example

1. Create `examples/<name>/package.json` with `"private": true` and every isomer dependency as `workspace:*`. Add a `dev` script for Vite and a `typecheck` script (`tsc -p tsconfig.json --noEmit`), which `pnpm -r typecheck` picks up.
2. Extend `../../tsconfig.base.json` in `tsconfig.json` with `"types": ["node", "vite/client", "vitest/globals"]` and `noEmit`, and list the directories to include (`examples/deck/tsconfig.json` is the template).
3. In `vite.config.ts`, set `resolve.alias` to `sourceAliases()` from `scripts/source_aliases.js`, so Vite and Vitest load each package's `src` rather than `dist`, and allow `repoRoot` under `server.fs`.
4. Put tests under `src/` or `server/`: `vitest.config.ts` runs `examples/*/src/**/*.test.ts` and `examples/*/server/**/*.test.ts` and nothing else.
5. Run `pnpm lint:fix` to add the license header every `.ts` and `.tsx` file under `examples/**` needs.
6. Add a root script (`deck:dev`, `studio:dev`) if the app is run from the repo root.

Vite is for the apps only; the library build stays `tsc`. Nothing under `examples/` is built or run by `pnpm verify` beyond typecheck, lint, and tests.
