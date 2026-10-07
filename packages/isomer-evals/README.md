<!-- markdownlint-disable MD033 -->
<p align="center">
  <img src="https://raw.githubusercontent.com/elastic/isomer/main/docs/logo.svg" alt="Isomer" width="96" height="96">
</p>
<h1 align="center">@elastic/isomer-evals</h1>
<p align="center"><strong>isomer</strong> <i>n.</i> — one formula, many forms; the same composition rendered to every surface.</p>
<p align="center">
  <a href="https://github.com/elastic/isomer/actions/workflows/ci.yml"><img src="https://github.com/elastic/isomer/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/elastic/isomer/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/License-Elastic%202.0-blue.svg" alt="License: Elastic License 2.0"></a>
</p>
<!-- markdownlint-enable MD033 -->

Scores whether a model produces valid, well-chosen compositions from a primitive pack's authoring context. Conformance asks "does this primitive render?"; this asks "does an agent reach for the right one?" It runs against a runtime from this repository.

This package is private and not published to npm; it runs from this repository.

It depends on `@elastic/isomer-sdk` at its own version and needs the peers `react` and `zod`, which the runtime under test already brings.

```ts
import { formatReport, runEvals } from '@elastic/isomer-evals';

const report = await runEvals({
  runtime,
  corpus,
  generate: async ({ prompt, evalCase, previousErrors }) =>
    callYourModel(
      [
        prompt,
        `## Request\n${evalCase.prompt}`,
        ...(previousErrors
          ? [`## Previous errors\n${previousErrors.join('\n')}`]
          : []),
      ].join('\n\n')
    ),
});

console.log(formatReport(report));
```

`prompt` contains shared authoring instructions. The callback adds the case request and any errors from the first attempt.

Stateless: no corpus, no goldens, no credentials, no model client, no environment reads, no writes. Three of the four scoring axes need no model at all, so a pack can run them in CI with a replayed `generate` and nothing configured.

## Docs

The [Evals](https://elastic.github.io/isomer/evals/) page covers the four axes, how to read the numbers, and the corpus shape.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
