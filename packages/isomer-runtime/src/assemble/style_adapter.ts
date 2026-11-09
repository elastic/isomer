/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AnyPrimitiveDefinition,
  type AnyPrimitivePack,
  contextWith,
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

/** The adapter the HTML and `snapshot` surfaces run, and the packs whose renderers resolve through it. */
export interface RuntimeStyling<TTheme, TRenderContext> {
  readonly adapter: ResolvedAdapter<TRenderContext> | undefined;
  readonly packs: readonly PrimitivePack<TTheme>[];
}

/**
 * The host's adapter if it supplied one, otherwise the packs' own.
 *
 * Two or more pack adapters compose: each collects and styles its own pack's
 * nodes, and a pack without one resolves through the first that has one.
 */
export const resolveStyling = <TTheme, TRenderContext>(
  packs: readonly PrimitivePack<TTheme>[],
  hostAdapter: ResolvedAdapter<TRenderContext> | undefined
): RuntimeStyling<TTheme, TRenderContext> => {
  if (hostAdapter !== undefined) {
    assertCollectorsMatch(packs, {
      source: "the runtime's styleAdapter",
      tag: hostAdapter.styleCollector,
    });
    return { adapter: hostAdapter, packs };
  }
  const owners = packs.flatMap((pack) =>
    pack.styleAdapter === undefined
      ? []
      : [
          {
            pack,
            adapter: pack.styleAdapter as ResolvedAdapter<TRenderContext>,
          },
        ]
  );
  for (const { pack, adapter } of owners) {
    assertCollectorsMatch(owners.length === 1 ? packs : [pack], {
      source: `pack "${pack.id}"'s styleAdapter`,
      tag: adapter.styleCollector,
    });
  }
  const [first, ...rest] = owners;
  if (first === undefined) {
    return { adapter: undefined, packs };
  }
  if (rest.length === 0) {
    return { adapter: first.adapter, packs };
  }
  assertRoutable(packs, owners);
  return {
    adapter: composeAdapters(packs, [first, ...rest]),
    packs: packs.map((pack) => ({
      ...pack,
      primitives: pack.primitives.map((definition) =>
        inPackContext(definition, pack.id)
      ),
    })),
  };
};

interface PackAdapter<TRenderContext> {
  readonly pack: AnyPrimitivePack;
  readonly adapter: ResolvedAdapter<TRenderContext>;
}

const COLLECTORS = Symbol.for('@elastic/isomer-runtime/pack-collectors');
const PACK_CONTEXTS = Symbol.for('@elastic/isomer-runtime/pack-contexts');

type ComposedCollector = {
  readonly [COLLECTORS]: ReadonlyMap<string, PrimitiveStyleCollector>;
};

type ComposedContext = {
  readonly [PACK_CONTEXTS]?: ReadonlyMap<string, unknown>;
};

const isObjectLike = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function';

/** One adapter that runs each pack adapter over its own collector and joins their stylesheets in pack order. */
const composeAdapters = <TRenderContext>(
  packs: readonly AnyPrimitivePack[],
  owners: readonly [
    PackAdapter<TRenderContext>,
    ...PackAdapter<TRenderContext>[],
  ]
): ResolvedAdapter<TRenderContext> => {
  const collectorOf = (
    collector: object,
    { pack }: PackAdapter<TRenderContext>
  ) => (collector as ComposedCollector)[COLLECTORS].get(pack.id) as object;
  const [first] = owners;
  return {
    createCollector: (options) => ({
      [COLLECTORS]: new Map(
        owners.map(({ pack, adapter }) => [
          pack.id,
          adapter.createCollector(options),
        ])
      ),
    }),
    resolveOptions: (composition, options) =>
      owners.reduce(
        (resolved, { adapter }) =>
          adapter.resolveOptions?.(composition, resolved) ?? resolved,
        options
      ),
    collectWrapperStyles: (collector, options) => {
      for (const owner of owners) {
        owner.adapter.collectWrapperStyles?.(
          collectorOf(collector, owner),
          options
        );
      }
    },
    collectViewStyles: (
      composition,
      dispatcher,
      collector,
      context,
      options,
      scope
    ) => {
      for (const owner of owners) {
        const { types } = owner.pack;
        owner.adapter.collectViewStyles?.(
          composition,
          {
            ...dispatcher,
            collectStyles: (node, styles, styleContext) => {
              if (types.has(node.type)) {
                dispatcher.collectStyles(node, styles, styleContext);
              }
            },
          },
          collectorOf(collector, owner),
          context,
          options,
          scope
        );
      }
    },
    collectAfterRender: (composition, collector, options) => {
      for (const owner of owners) {
        owner.adapter.collectAfterRender?.(
          composition,
          collectorOf(collector, owner),
          options
        );
      }
    },
    createRenderContext: (collector, options) => {
      const contexts = new Map(
        owners.map((owner) => [
          owner.pack.id,
          owner.adapter.createRenderContext(
            collectorOf(collector, owner),
            options
          ),
        ])
      );
      const base = contexts.get(first.pack.id) as TRenderContext;
      for (const pack of packs) {
        if (!contexts.has(pack.id)) {
          contexts.set(pack.id, base);
        }
      }
      return contextWith(
        (isObjectLike(base) ? base : {}) as TRenderContext,
        PACK_CONTEXTS,
        contexts
      );
    },
    renderStyles: (collector, options) =>
      owners
        .map((owner) =>
          owner.adapter.renderStyles(collectorOf(collector, owner), options)
        )
        .filter(Boolean)
        .join('\n'),
    getScriptText: (composition, options, scope) =>
      owners
        .map(
          ({ adapter }) =>
            adapter.getScriptText?.(composition, options, scope) ?? ''
        )
        .filter(Boolean)
        .join('\n'),
  };
};

/** `definition` with its `react` renderer handed its own pack's render context, wherever its parent came from. */
const inPackContext = (
  definition: AnyPrimitiveDefinition,
  packId: string
): AnyPrimitiveDefinition => {
  const { react } = definition.renderers as {
    react?: (node: unknown, env: { context?: unknown }) => unknown;
  };
  if (react === undefined) {
    return definition;
  }
  return {
    ...definition,
    renderers: {
      ...definition.renderers,
      react: (node: unknown, env: { context?: unknown }) => {
        const own = (env.context as ComposedContext | undefined)?.[
          PACK_CONTEXTS
        ]?.get(packId);
        if (!isObjectLike(env.context) || !isObjectLike(own)) {
          return react(node, env);
        }
        const context = Object.entries(own).reduce<object>(
          (view, [key, value]) => contextWith(view, key, value),
          env.context
        );
        return react(node, { ...env, context });
      },
    },
  };
};

/** Throws when an adapterless pack collects styles but two pack adapters could take them. */
const assertRoutable = (
  packs: readonly AnyPrimitivePack[],
  owners: readonly PackAdapter<unknown>[]
): void => {
  for (const pack of packs) {
    if (pack.styleAdapter !== undefined) {
      continue;
    }
    const collecting = pack.primitives.find(
      (definition) => definition.collectStyles !== undefined
    );
    if (collecting !== undefined) {
      throw new IsomerError(
        'AMBIGUOUS_STYLE_ADAPTER',
        `runtime: pack "${pack.id}" primitive "${collecting.type}" collects styles, but packs ${owners.map(({ pack: { id } }) => `"${id}"`).join(', ')} each declare a styleAdapter; supply styleAdapter to choose it`
      );
    }
  }
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
