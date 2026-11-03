# @elastic/isomer-lowering-lens

Plans native ES|QL Lens saved objects into versioned, plain-JSON plans a host can execute, and projects recorded ES|QL responses onto their Lens columns. No transport, renderer or chart binding.

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';

const planned = plan({ savedObject, dataViews });
if (planned.status === 'planned') {
  const [layer] = planned.plan.layers;
  const read = readResponse(layer, esqlResponse);
}
```

`zod` is the only peer, and nothing reachable imports React, the DOM, Node built-ins or another Isomer package. See [Lens lowering](docs/index.md) for the plan, what a host must supply, diagnostics and limits.
