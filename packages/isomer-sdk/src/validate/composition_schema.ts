/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodObject, type ZodType } from 'zod';

import { IsomerError } from '../composition/error';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';

/** `Composition.meta`: provenance and freshness, every field optional. */
export const metaSchema = z.object({
  source: z.string().optional(),
  generatedAt: z.string().optional(),
  ariaLabel: z.string().optional(),
  provenance: z
    .object({
      source: z.string().optional(),
      query: z.string().optional(),
      provider: z.string().optional(),
    })
    .optional(),
  freshness: z
    .object({
      asOf: z.string().optional(),
      stale: z.boolean().optional(),
      ttlSeconds: z.number().optional(),
    })
    .optional(),
  partialFailure: z
    .object({
      degraded: z.boolean().optional(),
      reason: z.string().optional(),
    })
    .optional(),
});

export interface CompositionSchemaOptions {
  bodyNodeSchema: ZodType<unknown>;
}

/**
 * Wraps a body-node union in the `Composition` envelope.
 *
 * `.strict()`, so an unknown root key is an error rather than silently carried:
 * the format crosses vendor boundaries, and a typo'd field that validates is
 * worse than one that fails. Most callers want
 * {@link getCompositionSchemaForDefinitions} instead, which memoizes.
 */
export const buildCompositionSchema = ({
  bodyNodeSchema,
}: CompositionSchemaOptions): ZodObject =>
  z
    .object({
      type: z.literal('view', { error: 'type must be "view"' }),
      version: z.literal(1).optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      theme: z.enum(['auto', 'light', 'dark']).optional(),
      body: z
        .array(bodyNodeSchema)
        .min(1, { error: 'must contain at least one node' }),
      meta: metaSchema.optional(),
    })
    .strict();

/**
 * One set of definitions resolved into a body-node union, with the schema
 * instance that actually landed in it per primitive type.
 *
 * The members matter to callers because a container's schema in the union is
 * built by `schemaFor` and is therefore *not* `definition.schema`. Anything
 * keyed on identity — the JSON Schema id registry, which names `$defs` — has to
 * be given these, or a container's projection silently loses its name.
 */
export interface ResolvedVocabulary {
  /** The discriminated union over every primitive type in this vocabulary. */
  bodyNodeSchema: ZodType<unknown>;
  /** Keyed by node type. A container's value comes from `schemaFor`, not `definition.schema`. */
  members: ReadonlyMap<string, ZodObject>;
}

/**
 * Builds a body-node union whose containers reference *this* union.
 *
 * The `z.lazy` closing the recursion is created here and discarded with the
 * vocabulary: it memoizes its getter after the first resolution, so one shared
 * across vocabularies would freeze on whichever union parsed first.
 */
export const resolveVocabulary = (
  definitions: readonly AnyPrimitiveDefinition[]
): ResolvedVocabulary => {
  if (definitions.length === 0) {
    throw new IsomerError(
      'EMPTY_VOCABULARY',
      'resolveVocabulary: at least one primitive is required'
    );
  }
  // Resolved once the union exists; nothing parses before this function returns.
  const pending: { union?: ZodType<unknown> } = {};
  const resolveUnion = (): ZodType<unknown> => {
    if (!pending.union) {
      throw new IsomerError(
        'VOCABULARY_UNRESOLVED',
        'resolveVocabulary: body-node union read before its vocabulary resolved'
      );
    }
    return pending.union;
  };

  const members = new Map<string, ZodObject>();
  const memberSchemas = definitions.map((definition) => {
    const schema = definition.schemaFor
      ? // One `z.lazy` per container: the JSON Schema projection gives a shared
        // wrapper its own anonymous `$def` instead of `$ref: #/$defs/bodyNode`.
        definition.schemaFor(z.lazy(resolveUnion))
      : definition.schema;
    members.set(definition.type, schema);
    return schema;
  });

  pending.union = z.discriminatedUnion(
    'type',
    memberSchemas as [ZodObject, ...ZodObject[]]
  );
  return { bodyNodeSchema: pending.union, members };
};

/**
 * {@link resolveVocabulary}, discarding the member instances.
 *
 * Only for a caller with no id registry to name; anything projecting to JSON
 * Schema needs the members and should use {@link resolveVocabulary}.
 */
export const buildBodyNodeSchemaFromDefinitions = (
  definitions: readonly AnyPrimitiveDefinition[]
): ZodType<unknown> => resolveVocabulary(definitions).bodyNodeSchema;

/**
 * A fresh `Composition` schema over `definitions`.
 *
 * Builds a new union per call. Prefer
 * {@link getCompositionSchemaForDefinitions} unless a fresh instance is
 * required.
 */
export const buildCompositionSchemaFromDefinitions = (
  definitions: readonly AnyPrimitiveDefinition[]
): ZodObject =>
  buildCompositionSchema({
    bodyNodeSchema: buildBodyNodeSchemaFromDefinitions(definitions),
  });

// Keyed on the definition array's identity: a runtime needs the same schema
// for its validator, parser, and authoring context, so hold the array
// `composePacks` returns rather than flattening per call. The vocabulary is
// cached with the schema because the JSON Schema id registry names member
// instances, and a second resolution would produce different ones.
interface CachedCompositionSchema {
  schema: ZodObject;
  vocabulary: ResolvedVocabulary;
}

const compositionSchemaCache = new WeakMap<object, CachedCompositionSchema>();

const cachedFor = (
  definitions: readonly AnyPrimitiveDefinition[]
): CachedCompositionSchema => {
  const cached = compositionSchemaCache.get(definitions);
  if (cached) {
    return cached;
  }
  const vocabulary = resolveVocabulary(definitions);
  const entry: CachedCompositionSchema = {
    vocabulary,
    schema: buildCompositionSchema({
      bodyNodeSchema: vocabulary.bodyNodeSchema,
    }),
  };
  compositionSchemaCache.set(definitions, entry);
  return entry;
};

/**
 * {@link buildCompositionSchemaFromDefinitions}, memoized per definition array.
 * Prefer this whenever the caller does not need a fresh schema instance.
 */
export const getCompositionSchemaForDefinitions = (
  definitions: readonly AnyPrimitiveDefinition[]
): ZodObject => cachedFor(definitions).schema;
