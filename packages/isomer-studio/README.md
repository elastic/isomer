<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-studio</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://www.npmjs.com/package/@elastic/isomer-studio"><img src="https://img.shields.io/npm/v/@elastic/isomer-studio.svg" alt="npm version"></a>
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

A dev and docs shell for any Isomer pack: a component gallery, per-primitive docs, a JSX editor with a live preview, and a preview of every surface the runtime has. It ships as a command-line tool with EUI, Emotion and Monaco bundled in.

```sh
npm install --save-dev @elastic/isomer-studio
```

```ts
// isomer-studio.config.ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { defineStudioConfig } from '@elastic/isomer-studio';

import { myPack } from './src';

export default defineStudioConfig({ runtime: createIsomerRuntime({ packs: [myPack] }) });
```

```sh
npx isomer-studio dev                                     # a local server with live reload
npx isomer-studio build --out dist/studio --base /studio/ # a static site
npx isomer-studio check --format junit --report report.xml # a headless CI gate
```

`check` validates and renders every example on every surface without a browser and exits 1 on any failure. In GitHub Actions, `elastic/isomer/.github/actions/isomer-studio` runs `check` and `build` and uploads the report and the site. Needs React 18 and Node 22.13 or later. Docs: [Isomer Studio](https://elastic.github.io/isomer/studio/). The reference pack's Studio: [elastic.github.io/isomer/studio-app/](https://elastic.github.io/isomer/studio-app/).

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
