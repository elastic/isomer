# @elastic/isomer-lowering-lens

Portable native-ES|QL Lens planning and response projection. This is an
intermediate data core, not general Lens semantic lowering or a renderer.
Ordinary form-based Lens, including metric form planning, is not supported.

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';

const result = plan({ savedObject, dataViews });
if (result.status === 'planned') {
  // The host chooses how to execute each query with authorized Lens context.
  const query = result.plan.queries[0];
  if (query) {
    const replay = readResponse(query, recordedResponse);
  }
}
```

The root is portable and has no React, Studio, SDK or runtime imports. Zod is a
required peer. React is an optional peer needed only for the named
`LensInspector` export from `@elastic/isomer-lowering-lens/inspector`. No wildcard
entrypoints are exposed. A future `/charts` entry will own chart binders; it
does not exist in this layer.

See the [contract](docs/index.md) for supported inputs, diagnostics, limits and
the browser inspector. Hosts own retrieval, metadata, credentials,
authorization, query execution, routing and side effects.
