---
navigation_title: Commands
description: The flags of isomer-studio init, dev, build and check, the config init writes, the files a build writes, and what a static site can and cannot do.
---

# Commands

```text
isomer-studio [command] [options]
```

With no command, `isomer-studio` runs `dev`. Every command takes these options:

| Option               | Default               | What it does                                                                                    |
| -------------------- | --------------------- | ----------------------------------------------------------------------------------------------- |
| `--cwd <dir>`        | The current directory | The project. Resolves `--config`, `--out` and `--report`.                                       |
| `--loader tsx\|none` | `tsx`                 | How the config is imported in Node. See [How the config loads](config.md#how-the-config-loads). |

`dev`, `build` and `check` also take `--config <file>`, which defaults to `isomer-studio.config.ts`, `.tsx` or `.js` in `--cwd`. Without a config they stop and say to run `init`.

The exit code is 0 on success, 1 when a command fails or `check` finds a failure, and 2 on bad usage, which also prints the usage text. `isomer-studio help` and `-h` print it too.

## `init`

```sh
npx @elastic/isomer-studio init
```

Writes a config that default-exports `defineStudioConfig({ title, runtime })`, registering by name each pack the package's entry exports: `isomer-studio.config.ts` beside a `tsconfig.json`, `isomer-studio.config.js` otherwise. Add `compose`, `createReactContext` or apps to it as the pack needs; see [The config](config.md). It stops when a config already exists or the entry exports no pack.

The entry is the first of `src/index` and `index`, as `.tsx`, `.ts`, `.jsx` or `.js`, that exists, then the `package.json` root export, `module` or `main`. Every export shaped like `definePrimitivePack`'s result is a pack, named exports and the default export alike, and the title is the `package.json` `name`.

The project needs React 18, `@elastic/isomer-sdk` and `zod`, which a pack has already. `@elastic/isomer-runtime` and `@elastic/isomer-studio` come from the Studio's own install when the project lacks them; see [How the config loads](config.md#how-the-config-loads).

## `dev`

```sh
npx isomer-studio dev --port 5179 --open
```

Serves the Studio on `127.0.0.1` and prints its URL.

| Option            | Default | What it does                             |
| ----------------- | ------- | ---------------------------------------- |
| `--port <number>` | `5179`  | `0` picks a free port.                   |
| `--open`          | Off     | Opens the Studio in the default browser. |

The server runs on Vite. When the config or anything it imports changes, the Studio re-renders in place with the new config: the page does not reload, so the route, the editor's text and every panel's state survive. The server re-runs the same modules in Node before the page updates, so PNGs never show a stale pack. A syntax error shows Vite's error overlay, and the Studio picks up again once the file is fixed. The editor compiles JSX on the server, and the PNG preview rasterizes the composition being edited.

### Comparing outputs

Workbench combines browser renders in one **Web** panel, labeled **HTML / React /
Snapshot** beneath its title, without a per-panel dropdown. HTML and its stylesheet
render in a shadow root, not an iframe; its links open in a new tab so following one
never unloads the draft. PNG stays separate; Slack, Markdown and
Text appear below. The **Outputs** menu lists these displayed outputs rather than
separate React and Snapshot entries when HTML is available. Workbench starts with every
output selected; pick one to inspect it at full size, or add others to compare.
Runtimes without HTML retain their React or Snapshot output.

**Enhancements**, aligned at the right of the Web header, is off by default.
The menu tests each registered enhancement's `appliesTo` predicate against the
current composition, including nested primitives through the runtime's child
walker. Only applicable enhancements appear. A dropdown showing the selected and
applicable counts (such as **Enhancements (0/1)**) lets you enable each
independently using its registered ID (such as `slideCopy` or `slideBuilds`);
the pack contract does not provide separate display names or descriptions.
Enhancements without a script are host-driven;
selecting one enables its render-time behavior but does not supply host controls
such as advancing a slide build. Scripted enhancements run on the HTML preview through the SDK's
host-run enhancement helper. Turning them off
remounts the unenhanced preview so script-created elements and listeners do not
linger. Only explicitly requested pack scripts run; embedded script elements are
not executed. The controls are disabled for Snapshot, in Source view, when no
enhancements are registered, or for a React-only preview without
`createReactContext`. Snapshot retains its fixed frame, theme resolution and
visibility rules. Sharing a panel is not a claim of pixel equality.

Studio does not install or launch a headless browser to capture previews.
It does not report pixel-difference percentages or infer matching outputs.
DOM or markup similarity is not proof of identical rendered
pixels. PNG previews still use Takumi, not a browser screenshot.

The editor, outputs, and prop drawer share one panel, with a resizer between
the borderless columns and independent scrolling in each. Its bottom strip has **Props** at the
left and validity at the right. Copy sits beside the source-format controls in
the editor as a compact icon with a tooltip. Output previews always form a
single vertical list, even in wide columns. Each output has a solid header against
the recessed output canvas in both color modes. The shared footer owns its top
divider; the editor has no additional bottom border.
**Props** toggles a full-width drawer, collapsed by default. Component
tabs select one schema-derived table for the selected primitive or its branded
JSX child components (including nested members).
It also includes other primitives in the draft and their children, rather than
offering a `+ Prop` action that edits only the first node. Tables are read-only;
edit props in JSX or JSON. Name, type and description columns use proportional
widths and top-aligned cells. The drawer sits outside the editor/output resizer,
so adjusting the split does not narrow the reference.
The 72-pixel collapsed navigation rail uses full-opacity white icons in centered,
32-pixel buttons. Its toggle stays fixed while the grouped entries scroll
vertically when they exceed the available height.
The white sidebar toggle sits beside the filter, using `transitionRightIn` to
collapse and `transitionLeftIn` to expand. At 1120 pixels or narrower, navigation
starts collapsed, expands over the content when toggled, and does not expand on
hover. Component tabs replace prop section
headings and label the active table for assistive technology.
Slack's preview padding uses the message canvas
background in both color modes.

## `build`

```sh
npx isomer-studio build --out dist/studio --base /studio/
```

Writes the Studio as a static site.

| Option          | Default       | What it does                                                                                                                                   |
| --------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `--out <dir>`   | `dist/studio` | Where the site goes. A previous build there, marked by its `.isomer-studio-build` file, is replaced; any other non-empty directory is refused. |
| `--base <path>` | `./`          | The URL path the site is served from. A trailing slash is added.                                                                               |

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
npx isomer-studio check --format junit --report studio-report.xml --png
```

Validates and renders every example of every primitive, composed with the config's `compose`, without a browser. It prints each failure and the totals, and exits 1 on any failure.

| Option                 | Default                       | What it does                                                                             |
| ---------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `--report <file>`      | None                          | Also writes the report to a file.                                                        |
| `--format json\|junit` | `json`                        | The report's format. JUnit has a test suite per primitive and a test case per check.     |
| `--png`                | Off                           | Also rasterizes every example. Needs a snapshot surface.                                 |
| `--surfaces <list>`    | Every surface the runtime has | A comma-separated subset of `react`, `html`, `snapshot`, `slack`, `markdown` and `text`. |

For each primitive and example, `check` runs:

- **`icon`:** the primitive has an icon, from the pack's `icons` or its definition, and it passes `assertPackIconsValid`.
- **`props`:** `compose` returns a composition that validates against the runtime. When it throws or the composition is invalid, every surface for that example is skipped.
- **One check per surface:** the surface renders without throwing. React renders through `react-dom/server` from the config's React. Slack output is also held to `SLACK_LIMITS` from `@elastic/isomer-sdk/slack`, and fails on a block wrapped in `unmodeledSlackBlock` whose type Isomer now models. A surface the primitive has no native renderer for is skipped, not failed.
- **`png`,** with `--png`: the composition rasterizes.

`check` renders the light theme.
