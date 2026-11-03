/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitivePack,
  IsomerError,
  type PrimitiveNode,
  type PrimitivePack,
  type PrimitiveStyleCollector,
} from '@elastic/isomer-sdk';

import type { HTMLStyleAdapter } from '../surfaces';

type ResolvedAdapter<TRenderContext> = HTMLStyleAdapter<
  PrimitiveNode,
  PrimitiveStyleCollector,
  TRenderContext
>;

/**
 * The adapter the HTML surface runs: the host's if it supplied one, otherwise
 * the one composed pack's that declares one.
 *
 * A runtime styles with one engine. Two packs declaring an adapter throw
 * `AMBIGUOUS_STYLE_ADAPTER`; the host chooses by passing `styleAdapter`.
 */
export const resolveStyleAdapter = <TTheme, TRenderContext>(
  packs: readonly PrimitivePack<TTheme>[],
  hostAdapter: ResolvedAdapter<TRenderContext> | undefined
): ResolvedAdapter<TRenderContext> | undefined => {
  if (hostAdapter !== undefined) {
    assertCollectorsMatch(packs, {
      source: "the runtime's styleAdapter",
      tag: hostAdapter.styleCollector,
    });
    return hostAdapter;
  }
  const styled = packs.filter((pack) => pack.styleAdapter !== undefined);
  if (styled.length > 1) {
    throw new IsomerError(
      'AMBIGUOUS_STYLE_ADAPTER',
      `runtime: packs ${styled.map(({ id }) => `"${id}"`).join(', ')} each declare a styleAdapter, but a runtime styles with one; supply styleAdapter to choose it`
    );
  }
  const owner = styled[0];
  if (owner?.styleAdapter === undefined) {
    return undefined;
  }
  assertCollectorsMatch(packs, {
    source: `pack "${owner.id}"'s styleAdapter`,
    tag: owner.styleAdapter.styleCollector,
  });
  return owner.styleAdapter as ResolvedAdapter<TRenderContext>;
};

interface CollectorSource {
  /** How the error names the adapter. */
  source: string;
  tag: string | undefined;
}

/**
 * Throws unless every pack that collects styles agrees with the adapter about
 * the collector's shape.
 *
 * A `collectStyles` hook is handed whatever collector the adapter created, and
 * that type is erased to `PrimitiveStyleCollector` by the time it arrives — so
 * a pack written against another engine corrupts the collector at render
 * rather than failing here. `styleCollector` is the declaration that makes the
 * pairing decidable; a pack or an adapter that omits it opts out.
 */
const assertCollectorsMatch = (
  packs: readonly AnyPrimitivePack[],
  { source, tag }: CollectorSource
): void => {
  if (tag === undefined) {
    return;
  }
  for (const pack of packs) {
    if (pack.styleCollector === undefined || pack.styleCollector === tag) {
      continue;
    }
    const collecting = pack.primitives.find(
      (definition) => definition.collectStyles !== undefined
    );
    if (collecting !== undefined) {
      throw new IsomerError(
        'INCOMPATIBLE_STYLE_COLLECTOR',
        `runtime: pack "${pack.id}" primitive "${collecting.type}" collects styles into a "${pack.styleCollector}" collector, but ${source} creates a "${tag}" one; supply a styleAdapter both packs were written against`
      );
    }
  }
};
