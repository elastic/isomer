/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A primitive pack as a value: a vocabulary, and the optional surfaces every
// primitive in it implements. Additive: a runtime composes any number of packs,
// and nothing about a pack decides how a composition is framed.

import { IsomerError } from '../composition/error';
import type {
  AnyPrimitiveDefinition,
  OptionalSurface,
  StyleHandle,
} from '../define/primitive_module';

import type { EnhancementDefinition } from './enhancements';

/**
 * The authoring-schema material a pack contributes for its own primitives.
 *
 * A subset of `AuthoringJsonSchemaOptions`: `$id`, `title`, `description`, and
 * `composition` describe the whole authoring schema a runtime builds, which is
 * a host decision, not a pack one. `pack/` does not import `validate/` for
 * this, so the shape is declared here rather than reused by reference.
 */
export interface PackAuthoringOptions {
  /** `$def` id to `description`, for this pack's own primitives. */
  describe?: Readonly<Record<string, string>>;
  /** `$defId.property` paths to drop, from this pack's own primitives. */
  omitProperties?: readonly string[];
}

/**
 * The HTML style-adapter hooks a pack may declare. Typed loosely here so `pack/` does not import `render/`.
 */
export type PackStyleAdapter = {
  /** See {@link PrimitivePackInput.styleCollector}. */
  styleCollector?: string;
  createCollector: (...args: never[]) => object;
  createRenderContext: (...args: never[]) => unknown;
  renderStyles: (...args: never[]) => string;
  /**
   * Whether `handle` belongs to this adapter's stylesheet. Required for a runtime to combine several packs' CSS: without it their handles cannot be routed and the host must pick one adapter.
   */
  ownsHandle?: (handle: StyleHandle) => boolean;
};

/** What a pack author passes to {@link definePrimitivePack}. */
export interface PrimitivePackInput<TTheme = unknown> {
  /** Stable identifier, used in capability reports and error messages. */
  id: string;
  /**
   * The optional surfaces this pack's primitives implement.
   *
   * Only `slack`, and it stays optional per primitive: the dispatcher converts
   * the mandatory markdown to Block Kit, so declaring it reports an intent
   * rather than imposing a requirement. Omit it entirely for a pack that
   * renders Slack through that fallback.
   */
  surfaces?: readonly OptionalSurface[];
  /** This pack's vocabulary. Node types must be unique within it, or construction throws. */
  primitives: readonly AnyPrimitiveDefinition[];
  /**
   * Progressive enhancements this pack's primitives can apply, by id.
   *
   * Declared by the pack because an enhancement is a fact about its
   * vocabulary — a sortable table, a copyable code block — and a host
   * composing packs it did not write cannot be expected to know the ids.
   * The runtime flattens these across packs; duplicate ids are rejected.
   */
  enhancements?: readonly EnhancementDefinition[];
  /**
   * Types that render as a self-contained picture rather than as text.
   *
   * A channel that cannot draw them inline uploads an image instead: the Slack
   * dispatcher swaps such a node for an `image` block and an upload request, so
   * a chart arrives as a PNG rather than as a markdown approximation of one.
   *
   * Declared by the pack because it is a fact about the vocabulary, and a host
   * composing packs it did not write cannot be expected to know it.
   */
  slackAssetTypes?: readonly string[];
  /**
   * Default HTML style adapter for this pack. A runtime that omits `styleAdapter` uses this when exactly one loaded pack declares one. Pass `styleAdapter` on the runtime to override or to choose among several.
   */
  styleAdapter?: PackStyleAdapter;
  /**
   * Names the collector shape this pack's `collectStyles` hooks mutate, so a
   * runtime can reject a pack paired with an adapter of a different tag
   * (`'distillate'` for `createDistillateHtmlStyleAdapter`). Defaults to
   * `styleAdapter.styleCollector`; a pack with neither opts out of the check.
   */
  styleCollector?: string;
  /**
   * The palette a frame must supply for this pack's nodes to be drawn on the
   * `svg` surface. Pass `themeBound<T>()` so {@link definePrimitivePack} infers
   * `PrimitivePack<T>`. Omit it to stay at `PrimitivePack<unknown>`.
   */
  theme?: (theme: TTheme) => void;
  /**
   * This pack's own contribution to the runtime's authoring JSON Schema.
   *
   * Merged across every composed pack, so a host does not hand-merge each
   * pack's `describe`/`omitProperties` into one options object itself. The
   * runtime-level `authoring` option is merged in last and wins on conflict.
   */
  authoring?: PackAuthoringOptions;
}

/**
 * Inference carrier for {@link PrimitivePackInput.theme}.
 *
 * `definePrimitivePack({ …, theme: themeBound<CoreTokens>() })` returns
 * `PrimitivePack<CoreTokens>`.
 */
export const themeBound =
  <T>(): ((theme: T) => void) =>
  () => {};

/**
 * A pack as the runtime sees it.
 *
 * `TTheme` is the palette this pack's `svg` renderers require — a *lower bound*
 * on whatever theme the runtime holding it supplies. It is carried by
 * {@link PrimitivePack.__theme} rather than by any real field, because
 * `primitives` is erased to `AnyPrimitiveDefinition[]` and a heterogeneous
 * inventory has no single node type to be generic over.
 *
 * The bound is declared, not derived: nothing checks it against what the
 * renderers actually read. State it at the definition with {@link themeBound}.
 * Bare `PrimitivePack` requires nothing and fits any runtime; a slot that must
 * hold packs of every palette is typed {@link AnyPrimitivePack}.
 */
export interface PrimitivePack<TTheme = unknown> {
  /** Unique among the packs a runtime composes, and used in error messages. */
  readonly id: string;
  /** See {@link PrimitivePackInput.surfaces}. */
  readonly surfaces: readonly OptionalSurface[];
  /** See {@link PrimitivePackInput.primitives}. */
  readonly primitives: readonly AnyPrimitiveDefinition[];
  /** Node types this pack owns, for duplicate detection across packs. */
  readonly types: ReadonlySet<string>;
  /** See {@link PrimitivePackInput.enhancements}. */
  readonly enhancements: readonly EnhancementDefinition[];
  /** See {@link PrimitivePackInput.slackAssetTypes}. */
  readonly slackAssetTypes: ReadonlySet<string>;
  /** See {@link PrimitivePackInput.styleAdapter}. */
  readonly styleAdapter?: PackStyleAdapter;
  /** See {@link PrimitivePackInput.styleCollector}. */
  readonly styleCollector?: string;
  /** See {@link PrimitivePackInput.authoring}. */
  readonly authoring?: PackAuthoringOptions;
  /**
   * Phantom: never present at runtime, never read.
   *
   * A property rather than a method so `strictFunctionTypes` checks it
   * contravariantly. A method signature is bivariant, which would let a pack
   * needing richer tokens sit in a slot supplying fewer and then read a field
   * nothing supplies — the exact failure this marker exists to prevent.
   */
  readonly __theme?: (theme: TTheme) => void;
}

/**
 * A pack of any palette, for storage positions: `never` is assignable to every
 * requirement, so a slot typed this way holds every pack.
 */
export type AnyPrimitivePack = PrimitivePack<never>;

/**
 * Builds a {@link PrimitivePack}.
 *
 * Infers `TTheme` from {@link PrimitivePackInput.theme}. Omitting `theme`
 * returns `PrimitivePack<unknown>` — requires nothing. A pack whose `svg`
 * renderers read tokens passes `theme: themeBound<CoreTokens>()`.
 */
export const definePrimitivePack = <TTheme = unknown>(
  input: PrimitivePackInput<TTheme>
): PrimitivePack<TTheme> => {
  if (input.primitives.length === 0) {
    throw new IsomerError(
      'EMPTY_PACK',
      `primitive pack "${input.id}": at least one primitive is required`
    );
  }
  assertUniquePrimitiveTypes(input.id, input.primitives);
  assertUniqueEnhancementIds(input.id, input.enhancements ?? []);
  const styleCollector =
    input.styleCollector ?? input.styleAdapter?.styleCollector;

  return {
    id: input.id,
    surfaces: input.surfaces ?? [],
    primitives: input.primitives,
    types: new Set(input.primitives.map((definition) => definition.type)),
    enhancements: input.enhancements ?? [],
    slackAssetTypes: new Set(input.slackAssetTypes ?? []),
    ...(input.styleAdapter !== undefined
      ? { styleAdapter: input.styleAdapter }
      : {}),
    ...(styleCollector !== undefined ? { styleCollector } : {}),
    ...(input.authoring !== undefined ? { authoring: input.authoring } : {}),
  };
};

/** Throws if `primitives` repeats a type or reuses one in `owned`. */
const assertUniquePrimitiveTypes = (
  id: string,
  primitives: readonly AnyPrimitiveDefinition[],
  owned: ReadonlySet<string> = new Set()
): void => {
  const seen = new Set(owned);
  for (const { type } of primitives) {
    if (seen.has(type)) {
      throw new IsomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        `primitive pack "${id}": primitive type "${type}" registered twice`
      );
    }
    seen.add(type);
  }
};

/** Throws if this pack registers the same enhancement id twice. */
const assertUniqueEnhancementIds = (
  id: string,
  enhancements: readonly EnhancementDefinition[]
): void => {
  const seen = new Set<string>();
  for (const definition of enhancements) {
    if (seen.has(definition.id)) {
      throw new IsomerError(
        'DUPLICATE_ENHANCEMENT',
        `primitive pack "${id}": enhancement "${definition.id}" registered twice`
      );
    }
    seen.add(definition.id);
  }
};

/**
 * Returns `pack` with extra primitives added, keeping its declared surfaces.
 * Throws on a type the pack already owns.
 *
 * This is how a host extends a published pack with its own primitive. Build the
 * extra definitions with the pack's own `definePrimitive`.
 */
export const extendPrimitivePack = <TTheme>(
  pack: PrimitivePack<TTheme>,
  primitives: readonly AnyPrimitiveDefinition[]
): PrimitivePack<TTheme> => {
  assertUniquePrimitiveTypes(pack.id, primitives, pack.types);
  const styleCollector =
    pack.styleCollector ?? pack.styleAdapter?.styleCollector;
  return {
    ...pack,
    primitives: [...pack.primitives, ...primitives],
    types: new Set([
      ...pack.types,
      ...primitives.map((definition) => definition.type),
    ]),
    ...(styleCollector !== undefined ? { styleCollector } : {}),
  };
};
