# @elastic/isomer-lowering-lens

Plans native ES|QL Lens saved objects into versioned, plain-JSON plans a host can execute, projects recorded ES|QL responses onto their Lens columns, and binds them to Isomer chart nodes. No transport or renderer.

```ts
import { plan, readResponse } from '@elastic/isomer-lowering-lens';

const planned = plan({ savedObject, dataViews });
if (planned.status === 'planned') {
  const [layer] = planned.plan.layers;
  const read = readResponse(layer, esqlResponse);
}
```

`bind` from `@elastic/isomer-lowering-lens/charts` turns the plan and its tables into a chart node. `zod` is the only peer, and nothing reachable imports React, the DOM or Node built-ins; `/charts` reaches only the charts pack's renderer-neutral `/model` entry. See [Lens lowering](docs/index.md) for the plan, what a host must supply, binding, diagnostics and limits, and [Metric](docs/metric.md) for what a metric supports.
