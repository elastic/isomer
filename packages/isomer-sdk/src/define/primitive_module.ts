/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { z, type ZodObject, type ZodType } from 'zod';

import type { ActionEventRef } from '../composition/action_event';
import {
  type ChildNodeRef,
  SURFACE_NAMES,
  type SurfaceName,
} from '../composition/body_node_base';
import { ISOMER_ERROR_CODES, IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../composition/node';
import type { ValidationError } from '../composition/validation_error';

import type { MarkdownContent } from './markdown_content';
import type { PrimitiveExample } from './primitive_example';
import type { SlackAssetCollector } from './slack_assets';
import type { SlackBlock } from './slack_blocks';
import { formatZodIssues, oneOf } from './zod_format';
import { requiredString } from './zod_helpers';

export type { PrimitiveNode };

/**
 * A primitive's entry in the catalog the authoring prompt is built from.
 *
 * Written for the model rather than for a developer: `useWhen` and `avoidWhen`
 * are what steer it away from reaching for the wrong primitive.
 */
export interface PrimitiveCatalogEntry {
  type: string;
  /** One line on what the primitive is for, in the model's voice. */
  purpose: string;
  /** Situations that call for this primitive. Phrase each as a user intent, not a shape. */
  useWhen: string[];
  /** Situations that look like a fit but are not, naming the primitive to reach for instead. */
  avoidWhen: string[];
  /** A node literal the authoring prompt inlines under this primitive. */
  example: unknown;
}

/** A style a renderer asks for by name, resolved to a class by the host's adapter. */
export interface StyleHandle {
  /** Stable lookup key. The adapter's map is keyed on this. */
  key: string;
  /** Debug-facing label, which an adapter may fold into a generated class name. */
  readableName: string;
}

/** Dotted path into a pack's theme tokens, e.g. `colors.text.subdued`. */
export type ThemeTokenPath = string;

/**
 * The sdk's own render context, and {@link DefaultPackTypes.context}.
 *
 * A pack with real theme tokens or a richer style-handle type declares its
 * own context in its {@link PackTypes}; {@link StyledRenderContext} is the
 * sdk's own extension. The bag is what lets a pack narrow without
 * re-declaring everything that mentions a context.
 */
export interface PrimitiveRenderContext {
  /**
   * The progressive enhancements this render may assume, by id. A set rather
   * than a field per feature so adding an enhancement costs no plumbing:
   * containers forward the whole context, and a renderer asks
   * `context.enhancements?.has('tableSort')`.
   *
   * Empty or absent is the baseline every host can render, so a renderer must
   * still answer the question on its own. See `docs/rendering.md`.
   */
  enhancements?: ReadonlySet<string>;
  /** Turns on `nodeAnchor` outside an HTML surface render, on the React and `svg` surfaces; inside one, the surface decides. */
  anchors?: boolean;
  /** Raises an interaction for the host to route. Absent means render non-interactively. */
  onEvent?: (event: ActionEventRef) => void;
}

/**
 * The render-context argument, optional only when omitting it is sound.
 *
 * The sdk's own {@link PrimitiveRenderContext} has no required field, so `{}`
 * is a complete value and a caller may leave it out. A pack that narrows the
 * context with a required member makes the argument mandatory.
 */
export type ReactContextArg<TContext> =
  Record<string, never> extends TContext
    ? [context?: TContext]
    : [context: TContext];

/**
 * {@link PrimitiveRenderContext} plus the CSS-in-JS hooks an HTML style adapter
 * supplies. A pack that styles differently uses its own `TContext` instead.
 */
export interface StyledRenderContext extends PrimitiveRenderContext {
  /** Resolves handles to a `className`. Absent means the host supplies no styling. */
  resolveClassName?: (...handles: StyleHandle[]) => string;
  /** Resolves a theme token to a CSS variable reference. Absent means inline the literal value. */
  cssVarRef?: (path: ThemeTokenPath) => `var(--${string})`;
}

/** Passed to a primitive's style collector so it can vary CSS by layout mode. */
export interface PrimitiveStyleCollectionContext {
  /** The render fills its container rather than sitting at a fixed width. */
  fluid?: boolean;
}

/** A pack's collected styles, opaque to the SDK. */
export type PrimitiveStyleCollector = object;

/**
 * The types a pack binds once and writes every primitive against: the palette
 * its frames supply, the context its `react` renderers receive, the collector
 * its `collectStyles` hooks mutate, and the Slack payload and collector types.
 *
 * Extend {@link DefaultPackTypes} and narrow only what the pack needs:
 *
 * ```ts
 * interface SlidesPackTypes extends DefaultPackTypes {
 *   theme: SlideTheme;
 *   context: SlideRenderContext;
 * }
 * ```
 */
export interface PackTypes {
  theme: unknown;
  context: unknown;
  collector: PrimitiveStyleCollector;
  slackBlock: unknown;
  slackCollector: unknown;
}

/** {@link PackTypes} as the sdk itself binds them, and the default everywhere. */
export interface DefaultPackTypes extends PackTypes {
  theme: unknown;
  context: PrimitiveRenderContext;
  collector: PrimitiveStyleCollector;
  slackBlock: SlackBlock;
  slackCollector: SlackAssetCollector;
}

/**
 * Each surface's renderer signature: the env bag it receives beyond the node,
 * and what it returns.
 *
 * Written out per surface rather than derived through an indexed access. A bag
 * is additive: a new extra on a surface is not an arity break. {@link Renderer}
 * indexes this table for the dispatcher cast; {@link Renderers} does not.
 */
export interface SurfaceMap<T extends PackTypes = DefaultPackTypes> {
  react: {
    env: {
      context: T['context'];
      scope: RenderScope<T>;
      /**
       * The frame's resolved palette, when this render is reached through the
       * `svg` surface. A bare `react`/`html` render has no {@link Frame} to
       * resolve one from, so it is absent there — a pack that needs a
       * literal color outside `svg` still goes through `context`.
       */
      theme?: T['theme'];
    };
    output: ReactNode;
  };
  /**
   * Identical to `react`, and served by the same renderer: an image backend
   * lays out the pack's DOM tree and stylesheet rather than a second tree
   * authored for it. The surface stays separate so a node can be hidden from
   * images alone, and so a {@link Frame} has something to draw inside.
   */
  svg: {
    env: {
      context: T['context'];
      scope: RenderScope<T>;
      /** The frame's resolved palette for this render's mode; see `react.env.theme`. */
      theme?: T['theme'];
    };
    output: ReactNode;
  };
  text: {
    env: {
      scope: RenderScope<T>;
    };
    output: string;
  };
  /** Content built with `md`, escaped where it lands; authored Markdown source goes through `md.authored`. */
  markdown: {
    env: {
      scope: RenderScope<T>;
    };
    output: MarkdownContent;
  };
  /**
   * Returns one payload or several, so a primitive need not wrap a single
   * payload in an array.
   */
  slack: {
    env: {
      collector?: T['slackCollector'];
      scope: RenderScope<T>;
    };
    output: T['slackBlock'] | readonly T['slackBlock'][];
  };
}

/**
 * The dispatcher a renderer is given so a container can recurse into a child
 * owned by another pack. Erased to {@link PrimitiveNode}: a heterogeneous
 * inventory has no single node type to name.
 *
 * Passed as `scope` on every renderer's env bag. The dispatcher's own named
 * methods stay positional.
 */
export interface RenderScope<T extends PackTypes = DefaultPackTypes> {
  readonly definitions: readonly AnyPrimitiveDefinition[];
  /** Throws for an unknown node type; a missing primitive is a bug, not a degradation. */
  getDefinition(node: PrimitiveNode): AnyPrimitiveDefinition;
  /** `undefined` when the node is hidden from `surface`, `sanitize` drops it, or its primitive declares no renderer for `surface`. */
  renderOn<S extends SurfaceName>(
    surface: S,
    node: PrimitiveNode,
    extras: Omit<SurfaceMap<T>[S]['env'], 'scope'>
  ): SurfaceMap<T>[S]['output'] | undefined;
  renderReact(node: PrimitiveNode, context?: T['context']): ReactNode;
  collectStyles(
    node: PrimitiveNode,
    styles: PrimitiveStyleCollector,
    context: PrimitiveStyleCollectionContext
  ): void;
  renderText(node: PrimitiveNode): string;
  renderMarkdown(node: PrimitiveNode): string;
  /** A child as content, for a container building with `md`. */
  renderMarkdownContent(node: PrimitiveNode): MarkdownContent;
  /** Empty when the node is hidden from `slack`, `sanitize` drops it, or its renderer returns nothing; a node with no `slack` renderer degrades through its markdown. */
  renderSlack(
    node: PrimitiveNode,
    collector?: T['slackCollector']
  ): readonly T['slackBlock'][];
  /** `0` when the node is hidden from `svg` or its primitive declares no `metrics.svgHeight`. */
  estimateSvgHeight(node: PrimitiveNode): number;
  /** Appends schema failures under `path` to `errors`, each naming `node`'s type. */
  validate(node: PrimitiveNode, path: string, errors: ValidationError[]): void;
}

/**
 * One surface's renderer for one node type, per {@link SurfaceMap}.
 *
 * Indexes the env bag. Do not use this to type the renderers map: the
 * written-out signatures on {@link Renderers} are what keep the bags checked
 * per surface.
 */
export type Renderer<
  TNode extends PrimitiveNode,
  S extends SurfaceName,
  T extends PackTypes = DefaultPackTypes,
> = (node: TNode, env: SurfaceMap<T>[S]['env']) => SurfaceMap<T>[S]['output'];

/**
 * The surface a pack may declare beyond the mandatory three.
 *
 * Only `slack`, and even that stays optional per primitive: the dispatcher
 * converts the mandatory markdown to Block Kit, so a missing Slack renderer
 * degrades rather than disappearing. `svg` is not here because no primitive
 * implements it — the surface reuses `react`.
 */
export const OPTIONAL_SURFACES = [
  'slack',
] as const satisfies readonly SurfaceName[];

/** One of the {@link OPTIONAL_SURFACES}. */
export type OptionalSurface = (typeof OPTIONAL_SURFACES)[number];

/**
 * One renderer per surface a primitive implements.
 *
 * `react`, `text`, and `markdown` are always required: those three are what
 * make "every composition degrades" true. `react` serves the `svg` surface
 * too, so targeting images costs a primitive nothing.
 *
 * `slack` is declared method-style deliberately: method parameters are checked
 * bivariantly, which is what lets a pack narrow the collector's node type.
 */
export interface Renderers<
  TNode extends PrimitiveNode,
  T extends PackTypes = DefaultPackTypes,
> {
  react(
    node: TNode,
    env: {
      context: T['context'];
      scope: RenderScope<T>;
      /** See {@link SurfaceMap.react}'s `env.theme`. */
      theme?: T['theme'];
    }
  ): ReactNode;
  text(
    node: TNode,
    env: {
      scope: RenderScope<T>;
    }
  ): string;
  markdown(
    node: TNode,
    env: {
      scope: RenderScope<T>;
    }
  ): MarkdownContent;
  slack?(
    node: TNode,
    env: {
      collector?: T['slackCollector'];
      scope: RenderScope<T>;
    }
  ): T['slackBlock'] | readonly T['slackBlock'][];
}

/**
 * Measurements a frame can ask of a node before drawing it.
 *
 * `svgHeight` is optional. The height estimate is `0` when it is missing, so
 * a frame that sums node heights sizes short.
 */
export interface PrimitiveMetrics<TNode extends PrimitiveNode> {
  /** The node's drawn height in pixels at the frame's width. */
  svgHeight?: (node: TNode) => number;
}

/**
 * Every primitive's schema is an object schema, because {@link definePrimitive}
 * extends it with `id` and `surfaces` and the composition builds a
 * `z.discriminatedUnion('type', …)` over them. Typed as `ZodObject` rather
 * than `ZodType<unknown>` so a union or intersection schema is a compile
 * error at the definition, not a runtime failure at the first `.extend()`.
 * Zod 4 types `z.object().superRefine(…)` as a `ZodObject` and preserves the
 * refinement through `.extend()`, so top-level refinements are unaffected.
 */
export type PrimitiveSchema = ZodObject;

/**
 * The child-ref shape a primitive definition's own `children` returns.
 *
 * {@link ChildNodeRef} stays erased (`node: unknown`) because
 * `createChildNodeWalker` mixes children from every primitive type in the
 * runtime into one map and cannot name a single node type for them. A single
 * definition has no such excuse: its `children` should not type-check
 * against `unknown` and let something that is not a {@link PrimitiveNode} —
 * `null`, for instance — silently disappear from every tree walk.
 */
export interface PrimitiveChildRef extends ChildNodeRef {
  node: PrimitiveNode;
}

/**
 * One primitive: its node type, schema, catalog entry, and a renderer per
 * surface. The unit of vocabulary, and what {@link definePrimitive} takes.
 *
 * `T` is the pack's {@link PackTypes}, bound once with
 * {@link definePrimitiveFor} so each primitive names only `TNode`.
 */
export interface PrimitiveDefinition<
  TNode extends PrimitiveNode,
  T extends PackTypes = DefaultPackTypes,
  TSchema extends PrimitiveSchema = PrimitiveSchema,
> {
  /** The node's discriminant, and the key this primitive occupies in an inventory. */
  type: TNode['type'];
  /** How the authoring prompt describes this primitive to the model. */
  catalog: PrimitiveCatalogEntry;
  /**
   * Driven by the conformance harness, bare or named; read them with
   * `exampleNodes` or `primitiveExamples`. The catalog `example` is what the
   * prompt shows.
   */
  examples: readonly (TNode | PrimitiveExample<TNode>)[];
  /**
   * This primitive on its own. A container declares
   * {@link PrimitiveDefinition.schemaFor} as well, and uses
   * {@link unresolvedBodyNodeSchema} in the child slot here.
   */
  schema: TSchema;
  /**
   * A container's schema, bound to the body-node union of the composition it is
   * being built into.
   *
   * Declaring the shape and letting each composition supply its own union is
   * what lets one primitive appear in two runtimes with different inventories:
   * `z.lazy` memoizes per instance, and an instance built here belongs to
   * exactly one union.
   */
  schemaFor?: (bodyNodeSchema: ZodType<unknown>) => PrimitiveSchema;
  /** One function per surface; `react` serves `svg` as well. */
  renderers: Renderers<TNode, T>;
  /** Sizing a frame can ask for before drawing. Absent means it cannot be measured. */
  metrics?: PrimitiveMetrics<TNode>;
  /**
   * Render-time URL trust, the second of the two layers in `validate/url.ts`.
   *
   * Returning `null` drops the node. Applied even to an unvalidated node, so a
   * renderer invoked directly still cannot emit an unsafe URL.
   */
  sanitize?: (node: TNode) => TNode | null;
  /**
   * Nested nodes, for containers, in the order the `react` renderer draws
   * them; `findNodeElementPairs` relies on it. Absent means a leaf.
   */
  children?: (node: TNode) => readonly PrimitiveChildRef[];
  /**
   * True when this node produces surface output of its own, not only via
   * {@link PrimitiveDefinition.children}. A non-empty `children` result is
   * otherwise the complete source of rendered content, so a hybrid container
   * that still owns string fields returns true to keep rendering when every
   * nested node is hidden from the surface.
   */
  hasOwnContent?: (node: TNode) => boolean;
  /** Contributes this node's CSS by mutating `styles`, once per node per render. */
  collectStyles?: (
    node: TNode,
    env: { styles: T['collector']; context: PrimitiveStyleCollectionContext }
  ) => void;
}

/**
 * {@link PrimitiveDefinition} with every type parameter erased, and the form an
 * inventory is stored in.
 *
 * A heterogeneous pack has no single `TNode` to be generic over, so the
 * renderers degrade to `unknown` here.
 *
 * Each field carries the same contract as its {@link PrimitiveDefinition}
 * counterpart; only the types are erased.
 */
export interface AnyPrimitiveDefinition {
  type: string;
  catalog: PrimitiveCatalogEntry;
  examples: readonly (PrimitiveNode | PrimitiveExample)[];
  schema: PrimitiveSchema;
  schemaFor?: (bodyNodeSchema: ZodType<unknown>) => PrimitiveSchema;
  renderers: Record<'react' | 'text' | 'markdown', unknown> &
    Partial<Record<'slack', unknown>>;
  metrics?: {
    svgHeight?: unknown;
  };
  sanitize?: unknown;
  children?: unknown;
  hasOwnContent?: unknown;
  collectStyles?: unknown;
}

/** Parses `node` against `schema`, appending path-prefixed messages to `errors`. */
export const validateWithSchema = (
  schema: PrimitiveSchema,
  node: unknown,
  path: string,
  errors: ValidationError[]
): void => {
  const result = schema.safeParse(node, { reportInput: true });
  if (!result.success) {
    errors.push(...formatZodIssues(result.error.issues, path));
  }
};

/** The `id` every node may carry, unique within a composition. */
export const bodyNodeIdSchema = requiredString('must be a non-empty string');

/** The `surfaces` allowlist on a node. Absent means every surface; empty is rejected. */
export const bodyNodeSurfacesSchema = z
  .array(
    z.enum(SURFACE_NAMES, {
      error: () => oneOf(SURFACE_NAMES),
    })
  )
  .min(1, { error: 'must contain at least one surface' });

/**
 * The child slot in a container's standalone {@link PrimitiveDefinition.schema},
 * where no body-node union is available.
 *
 * Deliberately permissive rather than `z.unknown()`: it still rejects a child
 * that is not a node at all, which is the error worth catching without an
 * inventory. Anything that depends on *which* types are legal — the validator,
 * the parser, the JSON Schema projection — goes through
 * {@link PrimitiveDefinition.schemaFor} and sees the real union.
 */
export const unresolvedBodyNodeSchema = z.looseObject({
  type: requiredString('must be a non-empty string'),
});

/**
 * Declares one primitive, extending its schema with the `id` and `surfaces`
 * fields every node carries, and closing it to unknown keys so a node is held
 * to the same rule as the composition root and the JSON Schema an agent reads.
 * A schema with its own catchall (`z.looseObject`) keeps it.
 *
 * A pack normally calls the form {@link definePrimitiveFor} binds to its own
 * {@link PackTypes}, so each primitive names only `TNode`.
 */
export const definePrimitive = <
  TNode extends PrimitiveNode,
  T extends PackTypes = DefaultPackTypes,
  TSchema extends PrimitiveSchema = PrimitiveSchema,
>(
  definition: PrimitiveDefinition<TNode, T, TSchema>
): PrimitiveDefinition<TNode, T, WithNodeFields<TSchema>> => {
  const { schemaFor } = definition;
  return {
    ...definition,
    schema: withNodeFields(definition.schema),
    // Both forms get the node fields, or a container would accept `id` and
    // `surfaces` standalone and reject them inside a composition.
    ...(schemaFor
      ? {
          schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
            withNodeFields(schemaFor(bodyNodeSchema)),
        }
      : {}),
  };
};

/**
 * {@link definePrimitive} bound to one pack's {@link PackTypes}.
 *
 * ```ts
 * const define = definePrimitiveFor<SlidesPackTypes>();
 * export const note = define({ type: 'note', … });
 * ```
 */
export const definePrimitiveFor =
  <T extends PackTypes>() =>
  <
    TNode extends PrimitiveNode,
    TSchema extends PrimitiveSchema = PrimitiveSchema,
  >(
    definition: PrimitiveDefinition<TNode, T, TSchema>
  ): PrimitiveDefinition<TNode, T, WithNodeFields<TSchema>> =>
    definePrimitive<TNode, T, TSchema>(definition);

/**
 * `.extend()` on a generic `ZodObject` widens the shape to `any`, so the
 * return type is rebuilt from `TSchema`'s shape. The brand on a field schema
 * stays on that same object at runtime.
 */
export type WithNodeFields<TSchema extends PrimitiveSchema> =
  TSchema extends ZodObject<infer Shape>
    ? ZodObject<
        Shape & {
          id: ReturnType<typeof bodyNodeIdSchema.optional>;
          surfaces: ReturnType<typeof bodyNodeSurfacesSchema.optional>;
        }
      >
    : PrimitiveSchema;

// Marks the field schemas `definePrimitive` adds. A schema derived from a
// defined one shares them by reference, and `Symbol.for` matches across ESM and
// CommonJS copies of the SDK.
const NODE_FIELD = Symbol.for('elastic.isomer.node_field');

const nodeField = <T extends ZodType>(schema: T): T =>
  Object.defineProperty(schema, NODE_FIELD, { value: true });

const NODE_FIELDS = {
  id: nodeField(bodyNodeIdSchema.optional()),
  surfaces: nodeField(bodyNodeSurfacesSchema.optional()),
};

const isNodeField = (schema: unknown): boolean => {
  let current = schema;
  while (current && typeof current === 'object') {
    if (Object.hasOwn(current, NODE_FIELD)) return true;
    const { def } = current as {
      def?: { type?: string; innerType?: unknown };
    };
    if (def?.type !== 'optional') return false;
    current = def.innerType;
  }
  return false;
};

const withNodeFields = <TSchema extends PrimitiveSchema>(
  schema: TSchema
): WithNodeFields<TSchema> => {
  const reserved = Object.keys(NODE_FIELDS).find(
    (field) =>
      Object.hasOwn(schema.shape, field) && !isNodeField(schema.shape[field])
  );
  if (reserved) {
    throw new IsomerError(
      ISOMER_ERROR_CODES.RESERVED_NODE_FIELD,
      `definePrimitive: a primitive schema cannot declare \`${reserved}\`; every body node has it.`
    );
  }
  const extended = schema.extend(NODE_FIELDS);
  return (
    schema.def.catchall === undefined ? extended.strict() : extended
  ) as WithNodeFields<TSchema>;
};
