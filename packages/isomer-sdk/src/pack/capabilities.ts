/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// What a host can render, reported from packs rather than asserted by hand.
//
// Lives in the sdk so both the assembly layer and a pack import it from the
// same place; a pack must not have to depend on the assembly layer for it.

import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import type { AnyPrimitivePack } from './primitive_pack';

/** `native` renders through the primitive's own renderer, `fallback` through another surface's (Slack via markdown). */
export type SurfaceSupport = 'native' | 'fallback';

/**
 * What a runtime or a pack supports. Enhancement ids are open strings: each
 * pack declares its own on {@link PrimitivePack.enhancements}, and a runtime
 * reports the union.
 */
export interface HostCapabilities<TEnhancement extends string = string> {
  /** Primitive `type` values that can be dispatched. */
  primitives: string[];
  /** Surfaces that render, e.g. `html`, `slack`, `snapshot`. */
  surfaces: string[];
  /** Formats the host can ship, e.g. `html`, `slack`, `png`. Never `snapshot`, which only a rasterizer turns into a format. */
  formats: string[];
  /**
   * How each of `surfaces` renders each primitive, keyed by `type` then surface.
   * `slack` is `fallback` for a primitive with no `slack` renderer; every other
   * surface renders from `react`, `text`, or `markdown`, which are required.
   */
  support: Record<string, Record<string, SurfaceSupport>>;
  /** Progressive enhancements the packs declare, by id, which an HTML or React render may request. */
  enhancements?: Partial<Record<TEnhancement, boolean>>;
}

/** What {@link describeCapabilities} reports beyond the packs themselves. */
export interface CapabilitySources {
  /** The surfaces the caller built; `snapshot` exists only when a host supplied a frame. */
  surfaces: readonly string[];
  /** Formats produced outside the surfaces, such as a rasterizer's `png`. */
  formats?: readonly string[];
}

/** The one surface whose output is not itself a shippable format. */
const SNAPSHOT = 'snapshot';

/**
 * Reports the primitive types, surfaces, and formats a set of packs supports.
 *
 * `surfaces` is passed rather than derived because only the caller knows which
 * exist. Every surface but `snapshot` is also a format; `formats` adds the ones
 * no surface produces on its own, so a `png` is reported only when a host
 * registers the rasterizer that writes it.
 */
export const describeCapabilities = (
  packs: readonly AnyPrimitivePack[],
  { surfaces, formats = [] }: CapabilitySources
): HostCapabilities => {
  const enhancementIds = packs.flatMap((pack) =>
    pack.enhancements.map((definition) => definition.id)
  );
  const definitions = packs.flatMap((pack) => pack.primitives);
  return {
    primitives: definitions.map(({ type }) => type),
    surfaces: [...surfaces],
    formats: [...new Set([...surfaces, ...formats])].filter(
      (format) => format !== SNAPSHOT
    ),
    support: Object.fromEntries(
      definitions.map((definition) => [
        definition.type,
        Object.fromEntries(
          surfaces.map((surface) => [surface, supportOn(definition, surface)])
        ),
      ])
    ),
    ...(enhancementIds.length > 0
      ? {
          enhancements: Object.fromEntries(
            enhancementIds.map((id) => [id, true])
          ),
        }
      : {}),
  };
};

const supportOn = (
  { renderers }: AnyPrimitiveDefinition,
  surface: string
): SurfaceSupport =>
  surface === 'slack' && renderers.slack === undefined ? 'fallback' : 'native';
