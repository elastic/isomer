---
type: Reference
title: Public contract
description: Private, ESM only, a bin plus defineStudioConfig and adoptStylesheet, React 18 peers, EUI and Monaco bundled as dependencies.
tags: [isomer, studio, contract]
status: stable
stale_after: 2027-04-07
sources:
  - id: package
    resource: https://github.com/elastic/isomer/blob/main/packages/isomer-studio/package.json
    title: Package metadata
---

# Definition

- Private (`"private": true`), so the release workflow never publishes it. Source available under the Elastic License 2.0 (SPDX: `Elastic-2.0`). Node `>=22.13.0`.[^package]
- One ESM-only entry, `.`, and the `isomer-studio` bin, a shim that imports `dist/cli.js`. The tarball carries `bin`, `dist` (including the prebuilt `dist/app/` assets), `docs`, `README.md`, `LICENSE.txt`, `NOTICE.txt` and `THIRD_PARTY_LICENSES.md`.
- Peers: `@elastic/isomer-runtime`, `@elastic/isomer-sdk`, `react` and `react-dom` `^18.2.0`, `zod`. React stays at 18 until EUI's peer range allows 19.
- Dependencies carry what the app and CLI use: EUI and its Borealis theme, Emotion, `monaco-editor`, `slack-blocks-to-jsx`, `prettier`, `esbuild`, `esbuild-wasm` (pinned to match its `.wasm`), `tsx`, `vite` and `@vitejs/plugin-react` for `dev`, and `@elastic/isomer-image-takumi`.
- Workbench combines browser renders in a Web panel with an HTML / React / Snapshot subtitle, without a per-panel surface dropdown, kind badges or redundant group headings. The Outputs menu lists displayed outputs, consolidating React and Snapshot as HTML when available, with every output initially selected and no All surfaces option. HTML renders in a shadow root with its stylesheet; previewed links open in a new tab and forms do not submit, so a preview never navigates Studio. Right-aligned opt-in enhancement controls use registered IDs, filtered by `appliesTo` over the current composition and its child walker: a dropdown checklist shows selected/applicable counts for any number of choices. Only requested pack scripts run through the SDK host helper; changing selections remounts clean output. Scriptless enhancements retain their host-driven behavior. Snapshot, Source view, unstyled React fallbacks and compositions without applicable enhancements disable the controls. PNG stays separate above text-oriented outputs, without a footer hint. Slack preview padding matches the message background. The shared workbench Props button toggles an initially collapsed full-width drawer for the selected primitive, its branded JSX children (recursively), and other primitives in the draft. Component tabs select a table with proportional columns and top-aligned cells. There is no first-node quick-edit menu. Collapsed navigation icons use full opacity. Studio does not depend on, install or launch a headless browser for preview capture; PNGs use Takumi. There are no pixel-difference percentages or inferred matching groups.

Related: [root and CLI](/studio/entry-points/root.md).

The white sidebar toggle sits to the right of its filter, with `transitionRightIn`
for collapse and `transitionLeftIn` for expand. At 1120 pixels or narrower,
navigation starts collapsed and expands over the content only when toggled, never
on hover. The shared validity/Props/copy
bar and initially collapsed prop drawer span both workbench columns outside the
resizer. Component tabs label one active prop table, whose proportional columns
and top-aligned cells keep descriptions readable.

One outer panel contains borderless editor/output columns, their resizer, and
the shared footer/drawer. The shared bar has Props at the left, validity at the right.
Source copy belongs to the editor toolbar beside JSX/JSON, not the shared strip.

Output previews stay in a single vertical list at every column width, with
solid plain output headers against a recessed canvas in both color modes.
The source editor has no bottom border; the shared footer owns that divider. Toolbars
retain their control padding while columns abut EUI's overlapping border resizer.
Collapsed navigation has a 72-pixel rail with centered 32-pixel buttons and
scrollable, non-shrinking groups below the fixed toggle.

[^package]: Package metadata
