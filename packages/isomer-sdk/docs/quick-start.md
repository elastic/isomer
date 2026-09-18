# Quick start

A primitive and a pack from scratch, rendering on four of the six surfaces.

## 1. Describe the node

A primitive is a node type plus everything needed to validate and draw it. Start with the schema; the TypeScript shape is derived from it, so the two cannot drift.

```ts
import {
  type PrimitiveNode,
  optionalString,
  requiredString,
  z,
} from '@elastic/isomer-sdk';

export const kpiSchema = z.object({
  type: z.literal('kpi'),
  label: requiredString(),
  value: requiredString(),
  delta: optionalString().optional(),
});

export type KpiNode = z.infer<typeof kpiSchema> & PrimitiveNode;
```

## 2. Define the primitive

`definePrimitive` takes the schema, the agent-facing catalog entry, examples, and one renderer per surface. It returns the definition with `id` and `surfaces` added to the schema, so authors can address any node and hide it from a surface.

```tsx
import { definePrimitive } from '@elastic/isomer-sdk';
import { type SlackBlock } from '@elastic/isomer-sdk/slack';

const examples: KpiNode[] = [
  { type: 'kpi', label: 'Error rate', value: '0.4%', delta: '-0.2pp' },
];

export const kpi = definePrimitive({
  type: 'kpi',
  schema: kpiSchema,
  catalog: {
    type: 'kpi',
    purpose: 'State one measured value with an optional change.',
    useWhen: ['A single number answers the question.'],
    avoidWhen: ['Three or more values belong together — use a stat group.'],
    example: { type: 'kpi', label: 'Error rate', value: '0.4%' },
  },
  examples,
  renderers: {
    react: (node) => <p>{`${node.label}: ${node.value}`}</p>,
    text: (node) =>
      `${node.label}: ${node.value}${node.delta ? ` (${node.delta})` : ''}`,
    markdown: (node) =>
      `**${node.label}**: ${node.value}${node.delta ? ` _(${node.delta})_` : ''}`,
    slack: (node): SlackBlock => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${node.label}*\n${node.value}` },
    }),
  },
});
```

`definePrimitive`'s type arguments stay inferred: the typed `examples` fix the node type, and the schema type flows through to the JSX shim and the object builders. Naming `TNode` explicitly turns that off; see [Primitives](primitives.md#why-it-is-shaped-this-way).

`react`, `text`, and `markdown` are mandatory — those three are what make "every composition degrades" true. `slack` is optional per primitive even when the pack declares the surface, because the dispatcher falls back through markdown. There is no `svg` renderer to write: the image surface dispatches to `react`; see [Packs](packs.md).

## 3. Declare the pack

A pack is a vocabulary as a value: an id, the optional surfaces every primitive in it implements, and the primitives themselves.

```ts
import { definePrimitivePack } from '@elastic/isomer-sdk';

export const metricsPack = definePrimitivePack({
  id: 'metrics',
  surfaces: ['slack'],
  primitives: [kpi],
});
```

`surfaces` is optional and `slack` is its only member, so omitting it is fine for a pack that degrades through markdown.

`definePrimitivePack` returns `PrimitivePack<unknown>` — "asks nothing of a frame" — which is correct for this pack. A pack that needs a frame to carry tokens annotates its export with the palette it needs; see [the theme a pack requires](packs.md#the-theme-a-pack-requires).

## 4. Hand it to a runtime

The SDK renders nothing on its own. Composition happens in `@elastic/isomer-runtime`:

```ts
import { createIsomerRuntime } from '@elastic/isomer-runtime';

const runtime = createIsomerRuntime({ packs: [metricsPack] });

const composition = {
  type: 'view' as const,
  title: 'Checkout',
  body: [
    { type: 'kpi', label: 'Error rate', value: '0.4%', delta: '-0.2pp' },
    { type: 'kpi', label: 'P99 latency', value: '210ms' },
  ],
};
```

`runtime.surfaces.text.render(composition)`:

```text
CHECKOUT

Error rate: 0.4% (-0.2pp)

P99 latency: 210ms
```

`runtime.surfaces.markdown.render(composition)`:

```markdown
# Checkout

**Error rate**: 0.4% _(-0.2pp)_

**P99 latency**: 210ms
```

Slack gives three blocks — a header for the title, then one section per node. HTML gives `<section class="isomer framed" role="group" aria-label="Checkout"><div>…</div></section>`: the section holds one `div` hosting the rendered body, which the React surface's `wrapCompositionContent` does not insert, so style `.isomer` descendants rather than `.isomer >` children. There is no CSS, because a pack contributes collected styles through a style adapter and this one has none. See [Rendering](rendering.md).

## 5. Read what validation says

```ts
runtime.validate(composition);
// { valid: true, errors: [], warnings: [] }
```

Quiet, and correctly so: `kpi` declares no `metrics.svgHeight`, but this runtime has no frame that would measure nodes, so nothing reads that metric. Register a measuring frame and validation starts saying so; see [`sizesFromNodeHeights`](frame.md#sizesfromnodeheights). Warnings are surface-scoped, so a text or Slack host filters them out with `warningsForSurface(result, surface)`. Errors are a different matter:

```ts
runtime.parse({ type: 'view', body: [{ type: 'kpi', label: 'x' }] });
// { valid: false, errors: [{ path: 'body[0].value', message: 'is required' }] }
```

## 6. See what an agent would

```ts
const { schema, primitives, views } = runtime.getAuthoringContext();
// primitives → your one catalog entry, including `example`
// schema     → the authoring JSON Schema for this one-primitive composition
```

That schema is a walk over the validator projection: same primitive shapes, with shared defs named and host-only fields dropped. `parse` still uses the full validator schema, so a node that emits `id` still parses.

## 7. Prove every primitive holds up

`./testing` runs the same battery of assertions — renders without throwing on every surface, validates, degrades — over every example a primitive publishes, so a new pack gets this for one test file:

```ts
import {
  type PrimitiveConformanceHarness,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';

runPrimitiveInventoryConformance([kpi]); // every definition has an example; catalog.example parses

const harness: PrimitiveConformanceHarness = {
  /* wrapComposition, renderReact, renderText, … — see the harness contract in api.md */
};
const rows = primitiveConformanceRows([kpi]);
for (const row of rows) {
  await row.run(row, harness); // one call per example × per case
}
```

The [harness contract](api.md#testing) lists the required members, the optional ones, and what each case checks; a case whose optional member is absent is skipped. A pack with a container adds `nestForeignChild` to the harness, and the same run confirms it recurses through `scope` rather than a closed switch over its own types — see [Containers: `schemaFor` and `children`](primitives.md#containers-schemafor-and-children).

## Next

[Primitives](primitives.md) for the rest of the definition — `sanitize`, `children`, `metrics`, `collectStyles`, `schemaFor` · [Packs](packs.md) for declared surfaces and enhancements · [Rendering](rendering.md) for what each renderer is handed
