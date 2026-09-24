---
title: Primitives
description: A primitive is one entry in a pack's closed vocabulary: a node type, the schema that validates it, the copy that describes it to an agent, and one renderer...
url: https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/primitives
---

# Primitives
A primitive is one entry in a pack's closed vocabulary: a node type, the schema that validates it, the copy that describes it to an agent, and one renderer per surface. `definePrimitive` is where all of that is stated together, and it is the unit the dispatcher, the validator, and the JSON Schema projection are all keyed on.
The word names the _definition_, never the instance. An instance in a composition is a **node**.

## A complete primitive

```tsx
import { type PrimitiveNode, definePrimitive, optionalString, requiredString, z } from '@elastic/isomer-sdk';
import { type SlackBlock } from '@elastic/isomer-sdk/slack';

export const kpiSchema = z.object({
  type: z.literal('kpi'),
  label: requiredString(),
  value: requiredString(),
  delta: optionalString().optional(),
});

export type KpiNode = z.infer<typeof kpiSchema> & PrimitiveNode;

const examples: KpiNode[] = [{ type: 'kpi', label: 'Error rate', value: '0.4%', delta: '-0.2pp' }];

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
    text: (node) => `${node.label}: ${node.value}${node.delta ? ` (${node.delta})` : ''}`,
    markdown: (node) => `**${node.label}**: ${node.value}${node.delta ? ` _(${node.delta})_` : ''}`,
    slack: (node): SlackBlock => ({
      type: 'section',
      text: { type: 'mrkdwn', text: `*${node.label}*\n${node.value}` },
    }),
  },
});
```

The schema is the declaration: the node type is `z.infer` of it, the typed `examples` array fixes `TNode`, and `definePrimitive`'s type arguments stay inferred. The [quick start](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/quick-start) puts this primitive in a pack and renders it.

## The definition


| Field           | Required  | What it is                                                         |
|-----------------|-----------|--------------------------------------------------------------------|
| `type`          | yes       | The discriminator. Unique across every pack in a runtime.          |
| `schema`        | yes       | A Zod **object** schema for this node on its own.                  |
| `catalog`       | yes       | Agent-facing copy: `purpose`, `useWhen`, `avoidWhen`, `example`.   |
| `examples`      | yes       | Conformance nodes; the catalog `example` is what the prompt shows. |
| `renderers`     | yes       | `react`, `text`, `markdown` always; `slack` optionally.            |
| `schemaFor`     | container | The same schema, bound to the composition's body-node union.       |
| `sanitize`      | no        | Last-chance repair or rejection, run before every render.          |
| `children`      | container | Nested nodes, each with the field path it lives under.             |
| `hasOwnContent` | hybrid    | Whether the parent still renders when every child is hidden.       |
| `metrics`       | no        | `svgHeight`, so a measuring frame can size itself.                 |
| `collectStyles` | no        | Contributes CSS through the pack's style adapter.                  |

`definePrimitive` extends the schema with two optional fields, `id` so any node can be addressed and `surfaces` so an author can hide a node from a surface, and closes it to unknown keys, so a hallucinated field is a validation error rather than a silent strip. A schema built with `z.looseObject` keeps its catchall. The extension keeps the concrete schema type, including brands. A container's `schemaFor` gets the same treatment, or a node would be legal standalone and rejected inside a composition.

## Renderers, and which ones you owe

```ts
react(node, { context, scope }): ReactNode     
text(node, { scope }): string                  
markdown(node, { scope }): string              
slack?(node, { collector, scope }): unknown | readonly unknown[]
```

There is no `svg` renderer. The `svg` surface dispatches to `react`: an image backend lays out the pack's DOM tree and stylesheet, so a second tree authored for the image would be the same layout stated twice. Targeting images therefore costs a primitive nothing.
`slack` is the one optional renderer, and it degrades: with none the dispatcher converts the mandatory markdown to Block Kit, so a missing renderer costs fidelity and nothing else.
The second argument is a bag so a new extra on a surface is additive: an existing renderer destructures a subset and keeps compiling. `scope` is a `RenderScope`, the dispatcher erased to `PrimitiveNode` so a container can recurse into a child owned by another pack. Leaf renderers can omit the bag.

## Containers: `schemaFor` and `children`

A container holds other nodes, and it cannot know which types are legal, since that depends on the runtime it lands in. So it declares the _shape_ and lets the composition supply the union:
```ts
schema: z.object({ type: z.literal('wrap'), items: z.array(unresolvedBodyNodeSchema) }),
schemaFor: (bodyNode) => z.object({ type: z.literal('wrap'), items: z.array(bodyNode) }),
```

`unresolvedBodyNodeSchema` is the standalone slot: permissive but not `z.unknown()`, so a child that is not a node at all still fails without an inventory. Everything that depends on _which_ types are legal goes through `schemaFor`. A primitive that declares `schemaFor` is the one case where the node type stays a hand-written interface, because the body-node union is injected per composition and `z.infer` cannot name that cycle.
`children` returns each nested node **with the field path it lives under**:
```ts
children: (node) =>
  node.items.map((item, index) => ({
    node: item.node,
    path: `items[${index}].node`,
  }));
```

Returning bare nodes would leave every caller guessing the field name, and error paths would name a field that does not resolve. `hasOwnContent` exists for the hybrid case: a container that also owns string fields keeps rendering when every nested node is hidden from a surface, which a walker looking only at `children` would report as rendering nothing.
Every renderer recurses through `scope`, never a switch over the pack's own types. That is what lets a node from a second pack nest inside this one's container:
```tsx
renderers: {
  react: (node, { context, scope }) => (
    <>{node.items.map((item, i) => <Fragment key={i}>{scope.renderReact(item.node, context)}</Fragment>)}</>
  ),
  text: (node, { scope }) => node.items.map((item) => scope.renderText(item.node)).join('\n'),
  markdown: (node, { scope }) => node.items.map((item) => scope.renderMarkdown(item.node)).join('\n\n'),
},
```

A container that instead pattern-matches `item.node.type` against its own pack's types renders correctly until a host nests a node from a different pack, then throws `UNKNOWN_PRIMITIVE_TYPE`. `scope` is erased to `PrimitiveNode` precisely so that mistake cannot compile. `./testing`'s conformance harness has a case for this: implement `PrimitiveConformanceHarness.nestForeignChild` and it runs automatically.

## `sanitize`

Runs before every render, on every surface, and may return `null` to drop the node. It is the render-time half of the [URL trust policy](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/url-trust): the Zod refinement gives an agent a useful validation error, and `sanitize` means a renderer invoked with an unvalidated node still never emits an unsafe URL.

## `metrics.svgHeight`

Optional, and nothing ties it to the `svg` surface, so a node can render to `svg`, contribute `0` to a frame's height estimate, and leave a summing frame short. Validation reports it, but only when some frame in the runtime actually measures nodes, since a fixed-size document reads nothing from it.

## Pack types

Every contract here is generic in one bag, `PackTypes`: the palette a frame supplies (`theme`), the context `react` renderers receive (`context`), the collector `collectStyles` mutates (`collector`), and the Slack payload and collector types. `DefaultPackTypes` is the sdk's own binding, `PrimitiveRenderContext` and everything else `unknown`, and the default everywhere. A pack narrows what it needs once and binds `definePrimitive` to it:
```ts
interface SlidesPackTypes extends DefaultPackTypes {
  theme: SlideTheme;
  context: SlideRenderContext;
  slackBlock: SlackBlock;
}

export const definePrimitive = definePrimitiveFor<SlidesPackTypes>();
```

Each primitive then names only `TNode`, and `createPrimitiveDispatcher<TNode, SlidesPackTypes>` dispatches with the same types.
`collectStyles` is the same shape: `(node, { styles, context })`. The dispatcher's `collectStyles(node, styles, context)` stays positional.
`PrimitiveRenderContext` is `enhancements` and `onEvent`. CSS-in-JS lives on `StyledRenderContext` (`resolveClassName`, `cssVarRef`), which the HTML style adapter produces. A pack that styles differently declares its own `TContext`.

## Why it is shaped this way

**Type arguments stay inferred.** TypeScript has no partial inference, so naming `TNode` explicitly (`definePrimitive<KpiNode>({ … })`) resets `TSchema` to its default, and `buildJsxShim` and `buildObjectBuilders` then type that primitive's props loosely. Type the `examples` array with the schema-derived node type and let inference do the rest. Pass `TNode` explicitly only for a `schemaFor` container, whose node type is hand-written anyway.
**The schema must be a `ZodObject`**, not a union or an intersection. The composition builds a `z.discriminatedUnion('type', …)` over every primitive, and typing the field as `ZodObject` turns "this cannot be a union" into a compile error at the definition rather than a runtime failure at the first `.extend()`.
**The body-node union is supplied per composition**, not held in a module-global. `z.lazy` resolves its getter once and memoizes, so whichever composition parsed first would freeze the union for every later one. [Composition and validation](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/composition) covers the per-composition instances that use that memoization instead of fighting it.
**`slack` is declared method-style** because method parameters are checked bivariantly, and that is what lets a pack narrow the collector's node type.
**`svg` stays a separate surface** even though it shares a renderer, for two reasons: a node can be hidden from images alone with `surfaces: ['react']`, and a [Frame](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/frame) needs a document to draw the body inside.

## Next

[Packs](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/packs) · [Dispatch](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/dispatch) for what happens to these renderers at render time · [Composition and validation](https://docs-v3-preview.elastic.dev/pr-preview/pr-1/sdk/composition) for how the schemas compose