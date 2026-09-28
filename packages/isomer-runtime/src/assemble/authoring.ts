/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  type AnyPrimitivePack,
  type AuthoringJsonSchemaOptions,
  authoringSchemaSubset,
  buildAuthoringJsonSchema,
  type HostCapabilities,
  IsomerError,
  type PrimitiveCatalogEntry,
  type PrimitiveGroup,
} from '@elastic/isomer-sdk';
import { quoteInput } from '@elastic/isomer-sdk/author';

import type { JsonSchema, RegisteredViewSummary } from '../registry';

export type { HostCapabilities };

/**
 * Everything a host hands an agent so it can answer a question with a view:
 * the composition contract, what it may compose from, and what it can request
 * by id.
 *
 * Both halves come from one call deliberately. An agent choosing between
 * "route to a registered view" and "compose from primitives" needs to see both
 * options at once.
 */
export interface RuntimeAuthoringContext {
  /** Authoring JSON Schema for a `Composition` built from this runtime's primitives. */
  schema: JsonSchema;
  /** Catalog entries describing each available primitive, including one `example`. */
  primitives: PrimitiveCatalogEntry[];
  /** Every pack's primitive groups, in pack order, for an index of the catalog. */
  groups: PrimitiveGroup[];
  /**
   * Registered views an agent can request by id, with their input schemas.
   *
   * Read live rather than cached: a host may register views after building the
   * runtime, and an agent asking now should see what is registered now.
   */
  views: RegisteredViewSummary[];
  /**
   * The authoring JSON Schema restricted to `types`, e.g. for a registered
   * view's narrower input. Uncached, unlike {@link RuntimeAuthoringContext.schema}:
   * callers are expected to ask for a handful of subsets, not one per render.
   *
   * Throws `UNKNOWN_PRIMITIVE_TYPE` for a type this runtime does not register.
   */
  schemaFor(types: readonly string[]): JsonSchema;
  /**
   * The catalog entries of `types` and the slice of {@link RuntimeAuthoringContext.schema}
   * they reach, for an agent that reads an index first and looks up what it picks.
   *
   * Throws `UNKNOWN_PRIMITIVE_TYPE` for a type this runtime does not register.
   */
  describePrimitives(types: readonly string[]): PrimitiveDescriptions;
}

/** What {@link RuntimeAuthoringContext.describePrimitives} returns. */
export interface PrimitiveDescriptions {
  primitives: PrimitiveCatalogEntry[];
  /** The `$defs` the types reach, with the full schema's ids and the body-node union stubbed. */
  schema: JsonSchema;
}

/**
 * Merges every composed pack's {@link PrimitivePack.authoring} into one
 * options object, with the runtime-level `authoring` option applied last so
 * it wins on conflict. Spares a host from hand-merging each pack's
 * `describe` / `omitProperties` before passing `authoring` itself.
 */
const mergePackAuthoring = (
  packs: readonly AnyPrimitivePack[],
  runtimeAuthoring: AuthoringJsonSchemaOptions
): AuthoringJsonSchemaOptions => {
  let describe: Record<string, string> = {};
  const omitProperties: string[] = [];
  for (const pack of packs) {
    describe = { ...describe, ...pack.authoring?.describe };
    omitProperties.push(...(pack.authoring?.omitProperties ?? []));
  }
  return {
    ...runtimeAuthoring,
    describe: { ...describe, ...runtimeAuthoring.describe },
    omitProperties: [
      ...omitProperties,
      ...(runtimeAuthoring.omitProperties ?? []),
    ],
  };
};

/** Most unknown types an error names before it counts the rest. */
const MAX_LISTED_TYPES = 10;

/** Throws if a group names a type no pack registers, or a type sits in two groups across every pack. */
const assertGroupedOnce = (
  groups: readonly PrimitiveGroup[],
  known: ReadonlyMap<string, unknown>
): void => {
  const grouped = new Set<string>();
  for (const { title, types } of groups) {
    for (const type of types) {
      if (!known.has(type)) {
        throw new IsomerError(
          'UNKNOWN_PRIMITIVE_TYPE',
          `createIsomerRuntime: group "${title}" names "${type}", which no pack registers`
        );
      }
      if (grouped.has(type)) {
        throw new IsomerError(
          'DUPLICATE_PRIMITIVE_TYPE',
          `createIsomerRuntime: primitive type "${type}" is grouped twice`
        );
      }
      grouped.add(type);
    }
  }
};

/**
 * Builds the authoring JSON Schema and the primitive catalog once from
 * `definitions`, returning a factory that reuses them on every call and
 * reads the view list fresh.
 *
 * Projecting a discriminated union to JSON Schema is expensive and fixed for
 * the runtime's lifetime, so it is cached. The registered-view list is cheap
 * (each summary is projected once at `register`) and changes as a host
 * registers, so it is not.
 */
export const createRuntimeAuthoringContextFactory = (
  definitions: readonly AnyPrimitiveDefinition[],
  listViews: () => RegisteredViewSummary[],
  packs: readonly AnyPrimitivePack[],
  runtimeAuthoring: AuthoringJsonSchemaOptions = {}
): (() => RuntimeAuthoringContext) => {
  const options = mergePackAuthoring(packs, runtimeAuthoring);
  const schema = buildAuthoringJsonSchema(definitions, options);
  const primitives = definitions.map((definition) => definition.catalog);
  const definitionsByType = new Map(
    definitions.map((definition) => [definition.type, definition])
  );
  const groups = packs.flatMap((pack) => pack.authoring?.groups ?? []);
  assertGroupedOnce(groups, definitionsByType);

  const assertKnown = (caller: string, types: readonly string[]): void => {
    const missing = [
      ...new Set(types.filter((type) => !definitionsByType.has(type))),
    ];
    if (missing.length > 0) {
      const listed = missing.slice(0, MAX_LISTED_TYPES).map(quoteInput);
      const rest = missing.length - listed.length;
      throw new IsomerError(
        'UNKNOWN_PRIMITIVE_TYPE',
        `getAuthoringContext.${caller}: unknown primitive type(s) ${listed.join(', ')}${
          rest > 0 ? ` and ${rest} more` : ''
        }`
      );
    }
  };

  const schemaFor = (types: readonly string[]): JsonSchema => {
    assertKnown('schemaFor', types);
    const wanted = new Set(types);
    return buildAuthoringJsonSchema(
      definitions.filter((definition) => wanted.has(definition.type)),
      options
    );
  };

  const describePrimitives = (
    types: readonly string[]
  ): PrimitiveDescriptions => {
    assertKnown('describePrimitives', types);
    const wanted = [...new Set(types)];
    return {
      primitives: wanted.flatMap((type) => {
        const catalog = definitionsByType.get(type)?.catalog;
        return catalog === undefined ? [] : [catalog];
      }),
      schema: authoringSchemaSubset(schema, wanted),
    };
  };

  return () => ({
    schema,
    primitives,
    groups,
    views: listViews(),
    schemaFor,
    describePrimitives,
  });
};
