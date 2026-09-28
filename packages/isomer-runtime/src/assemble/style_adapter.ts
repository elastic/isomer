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
        context: adapter.createRenderContext(own, options),
      }));

      // A handle no part owns reaches every part, as `servedBy` does for types.
      const isOwned = (handle: StyleHandle): boolean =>
        parts.some(({ adapter }) => adapter.ownsHandle?.(handle));

      return mergedContextView(
        contexts.map(({ context }) => context),
        {
          resolveClassName: (...handles: StyleHandle[]) =>
            contexts
              .map(({ part, context }) => {
                const routed = handles.filter(
                  (handle) =>
                    part.adapter.ownsHandle?.(handle) || !isOwned(handle)
                );
                if (routed.length === 0 || !isObjectLike(context)) {
                  return '';
                }
                const resolve: unknown = Reflect.get(
                  context,
                  'resolveClassName'
                );
                return typeof resolve === 'function'
                  ? String(Reflect.apply(resolve, context, routed))
                  : '';
              })
              .filter(Boolean)
              .join(' '),
        }
      );
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

/** Whether `value` can carry properties: a non-null object or a function. */
const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

/**
 * Every part's context as one, reading `fields` first, then the last context
 * that owns the key enumerably, as a spread would, then the last that has it
 * at all. A
 * view rather than a copy: methods stay bound to their own context, so a
 * class-instance context keeps its prototype and private state.
 */
const mergedContextView = (
  contexts: readonly unknown[],
  fields: Record<string, unknown>
): Record<string, unknown> => {
  const objects = contexts.filter(isObjectLike).reverse();
  const own = (key: string | symbol) => Object.hasOwn(fields, key);
  const read = (key: string | symbol): unknown => {
    const owner =
      objects.find((context) =>
        Object.prototype.propertyIsEnumerable.call(context, key)
      ) ?? objects.find((context) => Reflect.has(context, key));
    if (owner === undefined) {
      return undefined;
    }
    const value: unknown = Reflect.get(owner, key, owner);
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(owner)
      : value;
  };
  return new Proxy<Record<string, unknown>>(
    {},
    {
      get: (_, key) =>
        own(key)
          ? (fields as Record<string | symbol, unknown>)[key]
          : read(key),
      has: (_, key) =>
        own(key) || objects.some((context) => Reflect.has(context, key)),
      ownKeys: () => [
        ...new Set([
          ...objects.flatMap((context) => Reflect.ownKeys(context)),
          ...Reflect.ownKeys(fields),
        ]),
      ],
      getOwnPropertyDescriptor: (_, key) => {
        if (own(key)) {
          return {
            value: (fields as Record<string | symbol, unknown>)[key],
            enumerable: true,
            configurable: true,
            writable: true,
          };
        }
        const owner =
          objects.find((context) =>
            Object.prototype.propertyIsEnumerable.call(context, key)
          ) ?? objects.find((context) => Object.hasOwn(context, key));
        const descriptor =
          owner && Reflect.getOwnPropertyDescriptor(owner, key);
        return descriptor && { ...descriptor, configurable: true };
      },
    }
  );
};
