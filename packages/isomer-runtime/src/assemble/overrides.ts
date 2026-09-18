/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import {
  type AnyPrimitiveDefinition,
  IsomerError,
  type PrimitiveNode,
  type PrimitivePack,
  type SurfaceMap,
} from '@elastic/isomer-sdk';

import type { RuntimePackTypes } from '../pack_types';

/** The env bags as the runtime holds them: context erased along with the rest. */
type ErasedSurfaceMap = SurfaceMap<RuntimePackTypes<unknown>>;

/**
 * Surfaces a renderer override may target.
 *
 * No `svg`: that surface dispatches to the `react` renderer, so overriding
 * `react` already changes both.
 */
const OVERRIDABLE_SURFACES = ['react', 'text', 'markdown', 'slack'] as const;

/**
 * Renderer signatures an override may replace, as the runtime holds them:
 * heterogeneous node union, theme and context erased.
 *
 * Declared method-style so parameters are checked bivariantly: a host may write
 * an override against its own node type (`(node: TableNode) => …`) rather than
 * widening to `PrimitiveNode`.
 */
interface OverridableRenderers {
  react(node: PrimitiveNode, env: ErasedSurfaceMap['react']['env']): ReactNode;
  text(node: PrimitiveNode, env: ErasedSurfaceMap['text']['env']): string;
  markdown(
    node: PrimitiveNode,
    env: ErasedSurfaceMap['markdown']['env']
  ): string;
  slack(
    node: PrimitiveNode,
    env: ErasedSurfaceMap['slack']['env']
  ): ErasedSurfaceMap['slack']['output'];
}

/**
 * Per-primitive-type renderer replacements, keyed by primitive `type`.
 *
 * `applyRendererOverrides` already checks that the type and the surface key
 * are real; this closes the value side.
 */
export type RuntimeRendererOverrides = Readonly<
  Record<string, Partial<OverridableRenderers>>
>;

/**
 * Returns `packs` with any matching entries in `overrides` merged into their
 * primitives' `renderers`. Throws if `overrides` targets a primitive type or a
 * surface key that no pack registers.
 *
 * Assumes the runtime's construction guards have already run.
 */
export const applyRendererOverrides = <TTheme>(
  packs: readonly PrimitivePack<TTheme>[],
  overrides: RuntimeRendererOverrides | undefined
): readonly PrimitivePack<TTheme>[] => {
  if (!overrides || Object.keys(overrides).length === 0) {
    return packs;
  }
  const known = new Set<string>();
  for (const pack of packs) {
    for (const type of pack.types) {
      known.add(type);
    }
  }
  const surfaces = new Set<string>(OVERRIDABLE_SURFACES);
  for (const [type, override] of Object.entries(overrides)) {
    if (!known.has(type)) {
      throw new IsomerError(
        'UNKNOWN_PRIMITIVE_TYPE',
        `runtime: renderer override targets unregistered primitive type "${type}"`
      );
    }
    for (const surface of Object.keys(override)) {
      if (!surfaces.has(surface)) {
        throw new IsomerError(
          'UNKNOWN_SURFACE',
          `runtime: renderer override for "${type}" targets unknown surface "${surface}"`
        );
      }
    }
  }
  return packs.map((pack) => ({
    ...pack,
    primitives: pack.primitives.map((definition) =>
      overrideDefinition(definition, overrides[definition.type])
    ),
  }));
};

const overrideDefinition = (
  definition: AnyPrimitiveDefinition,
  override: RuntimeRendererOverrides[string] | undefined
): AnyPrimitiveDefinition => {
  if (!override) {
    return definition;
  }
  const replacements = Object.fromEntries(
    Object.entries(override).filter(([, renderer]) => renderer !== undefined)
  );
  return {
    ...definition,
    renderers: {
      ...definition.renderers,
      ...replacements,
    },
  };
};
