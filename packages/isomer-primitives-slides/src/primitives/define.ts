/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Pack-bound `definePrimitive`: this pack's theme and render context, so each
// primitive names only `TNode`.

import {
  definePrimitiveFor,
  type PrimitiveDefinition as CorePrimitiveDefinition,
  type PrimitiveNode,
  z,
} from '@elastic/isomer-sdk';
import type { ZodObject, ZodType } from 'zod';

import type { SlidePackTypes } from '../render/context';

/** {@link CorePrimitiveDefinition} bound to this pack's types. */
export type PrimitiveDefinition<
  TNode extends PrimitiveNode,
  TSchema extends ZodObject = ZodObject,
> = CorePrimitiveDefinition<TNode, SlidePackTypes, TSchema>;

/**
 * Defines a primitive in this pack.
 *
 * Leave `TNode` and `TSchema` inferred so the schema's field brands survive.
 * Pass `TNode` only for a `schemaFor` container whose node type is not `z.infer`.
 */
export const definePrimitive = definePrimitiveFor<SlidePackTypes>();

/**
 * A container's child slot for `schemaFor`: the runtime's body-node union in
 * place of `unresolvedBodyNodeSchema`, described the way `field` already is.
 */
export const bodyNodes = (
  bodyNodeSchema: ZodType<unknown>,
  { description }: { description?: string }
) => {
  const slot = z.array(bodyNodeSchema).min(1);
  return description === undefined ? slot : slot.describe(description);
};
