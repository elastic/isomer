# `@elastic/isomer-evals`

Scores whether a model produces valid, well-chosen compositions from a primitive pack's authoring context. Conformance asks "does this primitive render?"; this asks "does an agent reach for the right one?" A pack author runs it against their own runtime.

```sh
npm install --save-dev @elastic/isomer-evals
```

```ts
import { formatReport, runEvals } from '@elastic/isomer-evals';

const report = await runEvals({
  runtime,
  corpus,
  generate: async ({ prompt }) => callYourModel(prompt),
});

console.log(formatReport(report));
```

Stateless: no corpus, no goldens, no credentials, no model client, no environment reads, no writes. Three of the four scoring axes need no model at all, so a pack can run them in CI with a replayed `generate` and nothing configured.

## Docs

The [Evals](https://elastic.github.io/isomer/evals/) page covers the four axes, how to read the numbers, and the corpus shape.

## License

Elastic License 2.0 (SPDX: `Elastic-2.0`). See [LICENSE.txt](LICENSE.txt).
