---
title: View registry
description: A registered view is a product-owned golden path: a stable id, the questions it answers, a typed input, and a builder that turns host data into a composition...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/view-registry
---

# View registry
A registered view is a product-owned golden path: a stable id, the questions it answers, a typed input, and a builder that turns host data into a composition. It is the trusted way to get a `Composition` — host code writes it, and the input is schema-gated before that code runs. The untrusted way is [an agent composing one](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context), which arrives through `runtime.parse` instead.
```ts
import { defineView } from '@elastic/isomer-runtime';
import { z } from 'zod';

export const serviceHealthView = defineView({
  id: 'observability.serviceHealth',
  title: 'Production service health',
  description: 'Summarizes service health, latency, and recent deploy risk.',
  answers: [
    'Are my services healthy right now?',
    'Did the latest deploy affect latency?',
  ],
  input: z.object({
    environment: z.string().optional().describe('Environment, e.g. "prod".'),
    range: z.string().optional().describe('Time range, e.g. "last 24h".'),
  }),
  build: async ({ context, input }) => buildComposition(await load(context, input)),
});
```


## Registering

Views reach a runtime two equivalent ways — at construction, or afterwards:
```ts
createIsomerRuntime({ packs, views: [serviceHealthView] });
runtime.viewRegistry.register(serviceHealthView);
```

Registering the same id twice throws. Registering after construction is expected, not a workaround: a host may build views per request or load them from a store, and [the authoring context](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context) reads the list live for exactly that reason.
`defineView` takes `build({ context, input })` and defaults `description` to `title`. Declaring a Zod `input` lets TypeScript derive `build`'s `input` type from the schema, so the two cannot disagree.

## Requesting

```ts
const { view, composition, validation } = await runtime.viewRegistry.request(
  'observability.serviceHealth',
  hostContext,
  { environment: 'prod', range: 'last 24h' }
);
```

The sequence is short and the order matters:
1. Look up the id — an unknown one throws `IsomerError` with `UNKNOWN_VIEW`.
2. If the view declared an input schema, parse the raw input through it. This happens **before** the builder runs, so bad input fails as a typed error rather than as something opaque from inside composition-building code.
3. Await the builder. A view may fetch; `context` is whatever the host passes — a session, a request, a services bundle — and this package never inspects it.
4. Validate the built composition and return it alongside the result.

Validation here is **reported, not enforced**. `request` hands back a `ValidationResult` and lets the caller decide; enforcement is the [surfaces'](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces) job, and doing it in both places would mean doing it inconsistently.

## Input errors

```ts
await runtime.viewRegistry.request('checkout.snapshot', ctx, { range: 42 });
// throws RegisteredViewInputError
//   .code → 'VIEW_INPUT_INVALID'
//   .viewId → 'checkout.snapshot'
//   .errors → [{ path, message }]
```

Catch it by `name` and `code`, or by import: `RegisteredViewInputError` is exported from the package entry.

## What an agent sees

`list()` and `get(id)` return summaries — id, title, description, answers, and an `inputSchema` projected from the Zod input to draft-2020-12 JSON Schema. The projection runs once, at `register`; every read hands back that summary. That projection is why a view declares its input once: the same schema gates the request and describes it to a model, so the two can never drift.
A view with no input schema is legal; its input passes through unvalidated and its summary carries no `inputSchema`.

## Next

[Authoring context](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/authoring-context) for the other path into a composition · [Surfaces](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/runtime/surfaces) for what happens after