/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z, type ZodType } from 'zod';

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import {
  buildCompositionSchema,
  type ResolvedVocabulary,
  resolveVocabulary,
} from './composition_schema';

type JsonSchema = Record<string, unknown>;

/** Options for {@link buildCompositionJsonSchema}. */
export interface CompositionJsonSchemaOptions {
  /** Base URI for the emitted schema, which `$ref`s resolve against. */
  $id?: string;
  /** Reaches the model, so it keeps the word "view". Defaults to `'view'`. */
  title?: string;
  /** Reaches the model too, so write it as guidance rather than as a type note. */
  description?: string;
  /**
   * A composition to project, when the caller already holds one and wants the
   * same instances named here.
   *
   * The whole composition rather than just its union: the id registry is keyed
   * on identity and a container's member is built by `schemaFor`, so a bare
   * union would let one composition's schema be projected while another's
   * members were registered, silently losing a container's `$def`.
   */
  composition?: ResolvedVocabulary;
  /**
   * Extra schemas to name in `$defs`, for types a pack references by `$ref`.
   * Each `id` becomes the `$defs` key, so it must be unique.
   */
  extraDefs?: readonly { schema: ZodType; id: string }[];
  /** `ref` gives a repeated schema its own `$def`; `inline` repeats it. Defaults to `ref`. */
  reused?: 'ref' | 'inline';
}

/**
 * Projects the composition schema to JSON Schema draft 2020-12, for hosts
 * that validate outside TypeScript.
 *
 * `$defs` are named per primitive type, plus `bodyNode` for the union.
 * Agent-facing prompt text uses `buildAuthoringJsonSchema` instead.
 */
export const buildCompositionJsonSchema = (
  definitions: readonly AnyPrimitiveDefinition[],
  options: CompositionJsonSchemaOptions = {}
): JsonSchema => {
  // Members from the composition, not `definitions` or `definition.schema`:
  // the two inventories can disagree, a container's member is built by
  // `schemaFor`, and the registry is keyed on identity.
  const composed = options.composition ?? resolveVocabulary(definitions);
  const { bodyNodeSchema, members } = composed;
  const compositionSchema = buildCompositionSchema({ bodyNodeSchema });

  // `metadata` replaces `z.toJSONSchema`'s default registry rather than
  // extending it, and `z.globalRegistry` is where every `.describe()` lives,
  // so ids are added to the global registry for the duration of this call
  // and the prior entries restored in `finally`. Only a schema's first
  // registration is recorded: a schema named twice (an `extraDefs` entry that
  // is also a member) must restore its original entry, not the first id.
  const previous = new Map<ZodType, unknown>();
  const registerId = (schema: ZodType, id: string): void => {
    if (!previous.has(schema)) {
      previous.set(schema, z.globalRegistry.get(schema));
    }
    z.globalRegistry.add(schema, { ...z.globalRegistry.get(schema), id });
  };
  registerId(bodyNodeSchema, 'bodyNode');
  for (const extra of options.extraDefs ?? []) {
    registerId(extra.schema, extra.id);
  }
  for (const [type, schema] of members) {
    registerId(schema, type);
  }
  try {
    return {
      ...z.toJSONSchema(compositionSchema, {
        target: 'draft-2020-12',
        metadata: z.globalRegistry,
        reused: options.reused ?? 'ref',
        cycles: 'ref',
        unrepresentable: 'any',
      }),
      ...(options.$id ? { $id: options.$id } : {}),
      title: options.title ?? 'View',
      description:
        options.description ??
        'A compact view that may include registered primitives.',
    };
  } finally {
    for (const [schema, entry] of previous) {
      if (entry === undefined) {
        z.globalRegistry.remove(schema);
      } else {
        z.globalRegistry.add(schema, entry as never);
      }
    }
  }
};
