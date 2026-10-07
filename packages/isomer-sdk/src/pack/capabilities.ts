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
  /** Render formats reachable, e.g. `html`, `slack`, `png`. */
  formats: string[];
  /**
   * How each of `formats` renders each primitive, keyed by `type` then format.
   * `slack` is `fallback` for a primitive with no `slack` renderer; every other
   * format renders from `react`, `text`, or `markdown`, which are required.
   */
  support: Record<string, Record<string, SurfaceSupport>>;
  /** Progressive enhancements the packs declare, by id, which an HTML or React render may request. */
  enhancements?: Partial<Record<TEnhancement, boolean>>;
}

/**
 * Reports the primitive types and render formats a set of packs supports.
 *
 * `formats` is passed rather than derived because only the caller knows which
 * surfaces exist: a runtime passes the surfaces it built, and a pack passes
 * what it can produce through its own entry points — a `png` reachable only
 * behind a host image binding is something no runtime can infer. `svg` in
 * particular depends on a frame, which is a runtime input and not a pack's to
 * report.
 * @param formats Candidate formats this caller can reach.
 */
export const describeCapabilities = (
  packs: readonly AnyPrimitivePack[],
  formats: readonly string[]
): HostCapabilities => {
  const enhancementIds = packs.flatMap((pack) =>
    pack.enhancements.map((definition) => definition.id)
  );
  const definitions = packs.flatMap((pack) => pack.primitives);
  return {
    primitives: definitions.map(({ type }) => type),
    formats: [...formats],
    support: Object.fromEntries(
      definitions.map((definition) => [
        definition.type,
        Object.fromEntries(
          formats.map((format) => [format, supportOn(definition, format)])
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
  format: string
): SurfaceSupport =>
  format === 'slack' && renderers.slack === undefined ? 'fallback' : 'native';
