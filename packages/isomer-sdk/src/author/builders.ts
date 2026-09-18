/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from 'zod';

import type { PrimitiveNode } from '../define/primitive_module';

import type { LooseSchema, SchemaOf } from './jsx_shim';

/** A node's fields without the `type` tag its builder supplies. */
export type BuilderInput<TNode extends PrimitiveNode> = Omit<TNode, 'type'>;

/** Builds one primitive node from its fields. */
export type NodeBuilder<TNode extends PrimitiveNode> = (
  input: BuilderInput<TNode>
) => TNode;

/** Any fields at all, for a primitive whose schema carries no shape. */
type ErasedNode<TType extends string> = PrimitiveNode &
  Record<string, unknown> & { type: TType };

/** The node a primitive's schema describes, or an {@link ErasedNode}. */
type BuilderNodeOf<P extends { type: string }> = [SchemaOf<P>] extends [never]
  ? ErasedNode<P['type']>
  : LooseSchema<SchemaOf<P>> extends true
    ? ErasedNode<P['type']>
    : z.infer<SchemaOf<P>> & PrimitiveNode & { type: P['type'] };

/** One builder per primitive, keyed by `type` and typed from that primitive's schema. */
export type BuilderMap<
  TPrimitives extends readonly { type: string }[] = readonly {
    type: string;
  }[],
> = {
  [P in TPrimitives[number] as P['type'] & string]: NodeBuilder<
    BuilderNodeOf<P>
  >;
};

/**
 * The builder for one primitive `type`.
 *
 * Typed but unvalidated: the input is spread onto `{ type }` as-is, so
 * agent-authored or untrusted fields still need a validator before rendering.
 */
export const defineNodeBuilder =
  <TNode extends PrimitiveNode>(type: TNode['type']): NodeBuilder<TNode> =>
  (input) =>
    ({ type, ...input }) as TNode;

/** A {@link BuilderMap} with one entry per primitive in `primitives`. */
export const buildObjectBuilders = <
  const TPrimitives extends readonly { type: string }[],
>(
  primitives: TPrimitives
): BuilderMap<TPrimitives> =>
  // The runtime map is homogeneous; only the type knows one builder per primitive.
  Object.fromEntries(
    primitives.map((primitive) => [
      primitive.type,
      defineNodeBuilder<PrimitiveNode>(primitive.type),
    ])
  ) as unknown as BuilderMap<TPrimitives>;
