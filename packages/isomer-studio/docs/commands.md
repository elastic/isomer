---
navigation_title: Commands
description: The flags of isomer-studio dev, build and check, the files a build writes, and what a static site can and cannot do.
---

# Commands

```text
isomer-studio <command> [options]
```

Every command takes these options:

| Option | Default | What it does |
| --- | --- | --- |
| `--config <file>` | `isomer-studio.config.ts`, `.tsx` or `.js` in `--cwd` | The config to load. |
| `--cwd <dir>` | The current directory | Resolves `--config`, `--out` and `--report`. |
| `--loader tsx\|none` | `tsx` | How the config is imported in Node. See [How the config loads](config.md#how-the-config-loads). |

The exit code is 0 on success, 1 when a command fails or `check` finds a failure, and 2 on bad usage, which also prints the usage text. `isomer-studio help` and `-h` print it too.

## `dev`

```sh
pnpm exec isomer-studio dev --port 5179 --open
```

Serves the Studio on `127.0.0.1` and prints its URL.

| Option | Default | What it does |
| --- | --- | --- |
| `--port <number>` | `5179` | `0` picks a free port. |
| `--open` | Off | Opens the Studio in the default browser. |

The server runs on Vite. When the config or anything it imports changes, the Studio re-renders in place with the new config: the page does not reload, so the route, the editor's text and every panel's state survive. The server re-runs the same modules in Node before the page updates, so PNGs never show a stale pack. A syntax error shows Vite's error overlay, and the Studio picks up again once the file is fixed. The editor compiles JSX on the server, and the PNG preview rasterizes the composition being edited.

## `build`

```sh
pnpm exec isomer-studio build --out dist/studio --base /studio/
```

Writes the Studio as a static site.

| Option | Default | What it does |
| --- | --- | --- |
| `--out <dir>` | `dist/studio` | Where the site goes. A previous build there, marked by its `.isomer-studio-build` file, is replaced; any other non-empty directory is refused. |
| `--base <path>` | `./` | The URL path the site is served from. A trailing slash is added. |

Every URL in the site resolves against `--base`, so the same build works at a domain's root or under a sub-path. Routes live in the URL's hash, so the host needs no rewrites. A `./` base works when the site is opened from any single directory, such as an unzipped CI artifact behind a static server.

```text
<out>/index.html
<out>/assets/app.js, assets/chunks/*   # the Studio and the config
<out>/assets/app.css                    # every stylesheet the config imports, apps included
<out>/assets/media/*                    # fonts and images those stylesheets reference
<out>/assets/studio.css                 # the Studio's chrome and Monaco's stylesheet
<out>/assets/codicon-<hash>.ttf         # Monaco's icon font
<out>/assets/editor.worker.js, ts.worker.js, json.worker.js
<out>/assets/slack.css                  # the Slack preview's stylesheet
<out>/assets/esbuild.wasm               # compiles JSX in the browser
<out>/png/manifest.json, png/<key>.png  # when the runtime has a snapshot surface
```

### Static sites

A static site has no server, so two things work differently from `dev`:

- **JSX** compiles in the browser with `esbuild-wasm`, fetched the first time the editor needs it.
- **PNGs** are prerendered. `build` composes every example in both themes with the config's `compose`, rasterizes each one, and names the file by the SHA-256 of the composition's canonical JSON. The page computes the same key and fetches the file. An edited composition has no file, so the PNG preview says "PNG previews of edited compositions need `isomer-studio dev`." An example that fails to compose or rasterize is reported and left out; the build still succeeds.

## `check`

```sh
pnpm exec isomer-studio check --format junit --report studio-report.xml --png
```

Validates and renders every example of every primitive, composed with the config's `compose`, without a browser. It prints each failure and the totals, and exits 1 on any failure.

| Option | Default | What it does |
| --- | --- | --- |
| `--report <file>` | None | Also writes the report to a file. |
| `--format json\|junit` | `json` | The report's format. JUnit has a test suite per primitive and a test case per check. |
| `--png` | Off | Also rasterizes every example. Needs a snapshot surface. |
| `--surfaces <list>` | Every surface the runtime has | A comma-separated subset of `react`, `html`, `snapshot`, `slack`, `markdown` and `text`. |

For each primitive and example, `check` runs:

- **`icon`:** the primitive has an icon, from the pack's `icons` or its definition, and it passes `assertPackIconsValid`.
- **`props`:** `compose` returns a composition that validates against the runtime. When it throws or the composition is invalid, every surface for that example is skipped.
- **One check per surface:** the surface renders without throwing. React renders through `react-dom/server` from the config's React. Slack output is also held to `SLACK_LIMITS` from `@elastic/isomer-sdk/slack`, and fails on a block wrapped in `unmodeledSlackBlock` whose type Isomer now models. A surface the primitive has no native renderer for is skipped, not failed.
- **`png`,** with `--png`: the composition rasterizes.

`check` renders the light theme.
