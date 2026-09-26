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
  scopeScript,
  type StyleHandle,
} from '@elastic/isomer-sdk';
import type { HTMLRenderDispatcher } from '@elastic/isomer-sdk/html';

import type { HTMLStyleAdapter } from '../surfaces';

/** The erased adapter shape the runtime holds, since `TContext` belongs to each pack. */
type AnyStyleAdapter = HTMLStyleAdapter<
  PrimitiveNode,
  PrimitiveStyleCollector,
  unknown
>;

interface AdapterEntry {
  packId: string;
  adapter: AnyStyleAdapter;
  /** Node types the declaring pack owns, so its part collects only its own. */
  types: ReadonlySet<string>;
}

interface CompositePart extends AdapterEntry {
  collector: PrimitiveStyleCollector;
}

/** One collector per contributing adapter, carried as a single opaque value. */
interface CompositeCollector {
  parts: readonly CompositePart[];
}

/**
 * The adapter the HTML surface runs: the host's if it supplied one, otherwise
 * the packs' own, combined.
 *
 * Composing rather than choosing is what lets a host load two styled packs
 * without knowing how either one produces CSS.
 */
export const resolveStyleAdapter = <TTheme, TRenderContext>(
  packs: readonly PrimitivePack<TTheme>[],
  hostAdapter:
    | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
    | undefined
):
  | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
  | undefined => {
  if (hostAdapter !== undefined) {
    assertCollectorsMatch(packs, () => [
      { source: "the runtime's styleAdapter", tag: hostAdapter.styleCollector },
    ]);
    return hostAdapter;
  }
  const entries: AdapterEntry[] = packs
    .filter((pack) => pack.styleAdapter !== undefined)
    .map((pack) => ({
      packId: pack.id,
      adapter: pack.styleAdapter as AnyStyleAdapter,
      types: pack.types,
    }));

  assertCollectorsMatch(packs, (pack) =>
    pack.styleAdapter
      ? [
          {
            source: `its own styleAdapter`,
            tag: pack.styleAdapter.styleCollector,
          },
        ]
      : entries.map(({ packId, adapter }) => ({
          source: `pack "${packId}"'s styleAdapter`,
          tag: adapter.styleCollector,
        }))
  );

  if (entries.length <= 1) {
    return entries[0]?.adapter as
      | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
      | undefined;
  }

  const unroutable = entries.filter(({ adapter }) => !adapter.ownsHandle);
  if (unroutable.length > 0) {
    throw new IsomerError(
      'AMBIGUOUS_STYLE_ADAPTER',
      `runtime: packs ${quoteIds(entries)} each declare a styleAdapter, but ${quoteIds(unroutable)} declare no ownsHandle, so their CSS cannot be routed and combined; that pack should declare ownsHandle, or supply styleAdapter to replace all of them`
    );
  }

  // The composite is erased; the host's `TRenderContext` is what its parts produce.
  return composeStyleAdapters(entries) as HTMLStyleAdapter<
    PrimitiveNode,
    PrimitiveStyleCollector,
    TRenderContext
  >;
};

interface CollectorSource {
  /** How the error names this adapter. */
  source: string;
  tag: string | undefined;
}

/**
 * Throws unless every pack that collects styles agrees with each adapter that
 * can serve it about the collector's shape.
 *
 * A `collectStyles` hook is handed whatever collector the serving adapter
 * created, and that type is erased to `PrimitiveStyleCollector` by the time it
 * arrives — so a pack written against another engine corrupts the collector at
 * render rather than failing here. `styleCollector` is the declaration that
 * makes the pairing decidable; a pack or an adapter that omits it opts out.
 *
 * `sourcesFor` is per pack because which adapters can reach one differs:
 * {@link composeStyleAdapters} routes a pack's own types to its own adapter,
 * so a pack that declares one answers only to it, while a pack that declares
 * none is collected by all of them.
 */
const assertCollectorsMatch = (
  packs: readonly AnyPrimitivePack[],
  sourcesFor: (pack: AnyPrimitivePack) => readonly CollectorSource[]
): void => {
  for (const pack of packs) {
    if (pack.styleCollector === undefined) {
      continue;
    }
    const collecting = pack.primitives.find(
      (definition) => definition.collectStyles !== undefined
    );
    if (collecting === undefined) {
      continue;
    }
    const mismatch = sourcesFor(pack).find(
      ({ tag }) => tag !== undefined && tag !== pack.styleCollector
    );
    if (mismatch) {
      throw new IsomerError(
        'INCOMPATIBLE_STYLE_COLLECTOR',
        `runtime: pack "${pack.id}" primitive "${collecting.type}" collects styles into a "${pack.styleCollector}" collector, but ${mismatch.source} creates a "${mismatch.tag}" one; supply a styleAdapter both packs were written against`
      );
    }
  }
};

/**
 * Fans every hook out across `entries`, routing each style handle to the
 * adapter that owns it so no pack's CSS is emitted twice or rendered against
 * another pack's theme.
 */
const composeStyleAdapters = (
  entries: readonly AdapterEntry[]
): AnyStyleAdapter => {
  const ownedTypes = new Set(entries.flatMap(({ types }) => [...types]));

  return {
    createCollector: (options) => ({
      parts: entries.map((entry) => ({
        ...entry,
        collector: entry.adapter.createCollector(options),
      })),
    }),

    resolveOptions: (composition, options) =>
      entries.reduce(
        (current, { adapter }) =>
          adapter.resolveOptions?.(composition, current) ?? current,
        options
      ),

    collectWrapperStyles: (collector, options) => {
      for (const { adapter, collector: own } of partsOf(collector)) {
        adapter.collectWrapperStyles?.(own, options);
      }
    },

    collectViewStyles: (composition, dispatcher, collector, ...rest) => {
      for (const part of partsOf(collector)) {
        part.adapter.collectViewStyles?.(
          composition,
          servedBy(dispatcher, part, ownedTypes),
          part.collector,
          ...rest
        );
      }
    },

    collectAfterRender: (composition, collector, options) => {
      for (const { adapter, collector: own } of partsOf(collector)) {
        adapter.collectAfterRender?.(composition, own, options);
      }
    },

    createRenderContext: (collector, options) => {
      const parts = partsOf(collector);
      const contexts = parts.map(({ adapter, collector: own }) => ({
        part: { adapter, collector: own },
        context: adapter.createRenderContext(own, options) as Record<
          string,
          unknown
        >,
      }));
      const merged = contexts.reduce<Record<string, unknown>>(
        (into, { context }) => ({ ...into, ...context }),
        {}
      );

      // A handle no part owns reaches every part, as `servedBy` does for types.
      const isOwned = (handle: StyleHandle): boolean =>
        parts.some(({ adapter }) => adapter.ownsHandle?.(handle));

      return {
        ...merged,
        resolveClassName: (...handles: StyleHandle[]) =>
          contexts
            .map(({ part, context }) => {
              const routed = handles.filter(
                (handle) =>
                  part.adapter.ownsHandle?.(handle) || !isOwned(handle)
              );
              const resolve = context.resolveClassName as
                ((...next: StyleHandle[]) => string) | undefined;
              return routed.length > 0 && resolve ? resolve(...routed) : '';
            })
            .filter(Boolean)
            .join(' '),
      };
    },

    renderStyles: (collector, options) =>
      partsOf(collector)
        .map(({ adapter, collector: own }) =>
          adapter.renderStyles(own, options)
        )
        .filter(Boolean)
        .join(''),

    getScriptText: (composition, options, scope) =>
      entries
        .map(
          ({ adapter }) =>
            adapter.getScriptText?.(composition, options, scope) ?? ''
        )
        .filter(Boolean)
        // One pack's script cannot redeclare or return past another's.
        .map(scopeScript)
        .join('\n'),
  };
};

/**
 * `dispatcher` with `collectStyles` silenced for types `part` does not serve.
 *
 * Every other member is passed through: the adapter still walks and renders
 * the whole composition, it just stops contributing other packs' rules to its
 * own collector.
 */
const servedBy = (
  dispatcher: HTMLRenderDispatcher<
    PrimitiveNode,
    PrimitiveStyleCollector,
    unknown
  >,
  part: CompositePart,
  ownedTypes: ReadonlySet<string>
): HTMLRenderDispatcher<PrimitiveNode, PrimitiveStyleCollector, unknown> => ({
  ...dispatcher,
  collectStyles: (node, styles, context) => {
    if (part.types.has(node.type) || !ownedTypes.has(node.type)) {
      dispatcher.collectStyles(node, styles, context);
    }
  },
});

const partsOf = (
  collector: PrimitiveStyleCollector
): readonly CompositePart[] => (collector as CompositeCollector).parts;

const quoteIds = (entries: readonly AdapterEntry[]): string =>
  entries.map(({ packId }) => `"${packId}"`).join(', ');
