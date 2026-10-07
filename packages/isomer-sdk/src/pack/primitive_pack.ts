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
import type { PrimitiveIcon } from '../define/primitive_icon';
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
  /** Headings an index catalog sorts this pack's primitives under, in order. */
  groups?: readonly PrimitiveGroup[];
}

/** A titled set of primitive types, listed together in an index catalog. */
export interface PrimitiveGroup {
  title: string;
  types: readonly string[];
}

/**
 * The HTML style-adapter hooks a pack may declare. Typed loosely here so `pack/` does not import `render/`.
 */
export type PackStyleAdapter = {
  /** See {@link PrimitivePackInput.styleCollector}. */
  styleCollector?: string;
  /** The hooks of `HTMLStyleAdapter` from `./html`, erased: a fresh collector per render, the context renderers receive, and the stylesheet the collector produced. */
  createCollector: (...args: never[]) => object;
  createRenderContext: (...args: never[]) => unknown;
  renderStyles: (...args: never[]) => string;
  /**
   * Whether `handle` belongs to this adapter's stylesheet. Required for a runtime to combine several packs' CSS: without it their handles cannot be routed and the host must pick one adapter.
   */
  ownsHandle?: (handle: StyleHandle) => boolean;
};

/** What a pack author passes to {@link definePrimitivePack}. */
export interface PrimitivePackInput {
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
   * Default HTML style adapter for this pack. A runtime that omits
   * `styleAdapter` runs the packs' own adapters, combined when more than one
   * pack declares one and each answers `ownsHandle`. Pass `styleAdapter` on
   * the runtime to replace them all.
   */
  styleAdapter?: PackStyleAdapter;
  /**
   * Names the collector shape this pack's `collectStyles` hooks mutate, so a
   * runtime can reject a pack paired with an adapter of a different tag.
   * Defaults to `styleAdapter.styleCollector`; a pack with neither opts out of
   * the check.
   */
  styleCollector?: string;
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
 * A pack as the runtime sees it.
 *
 * `TTheme` is the palette this pack's `react` renderers read as `env.theme`
 * when drawn through the `snapshot` surface — a *lower bound* on whatever theme
 * the runtime holding it supplies. It is carried by
 * {@link PrimitivePack.__theme} rather than by any real field, because
 * `primitives` is erased to `AnyPrimitiveDefinition[]` and a heterogeneous
 * inventory has no single node type to be generic over.
 *
 * The bound is declared, not derived: nothing checks it against what the
 * renderers actually read. State it at the definition as
 * `definePrimitivePack<T>(input)`.
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
  /**
   * Each primitive's `icon` by type, for the primitives that declare one, so a host listing them need not walk `primitives`.
   *
   * A frozen null-prototype dictionary: an absent type reads `undefined`, even `constructor`. Absent on a pack built by an SDK that predates icons; {@link iconsByType} derives it from `primitives`.
   */
  readonly icons?: Readonly<Record<string, PrimitiveIcon>>;
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
 * `TTheme` is the palette a frame must supply for this pack's nodes to be drawn
 * on the `snapshot` surface: `definePrimitivePack<CoreTokens>(input)`. Omitted, it is
 * `unknown`, which requires nothing.
 */
export const definePrimitivePack = <TTheme = unknown>(
  input: PrimitivePackInput
): PrimitivePack<TTheme> => {
  if (input.primitives.length === 0) {
    throw new IsomerError(
      'EMPTY_PACK',
      `primitive pack "${input.id}": at least one primitive is required`
    );
  }
  assertUniquePrimitiveTypes(input.id, input.primitives);
  assertUniqueEnhancementIds(input.id, input.enhancements ?? []);
  const types = new Set(input.primitives.map((definition) => definition.type));
  assertGroupedOnce(input.id, input.authoring?.groups ?? [], types);
  for (const type of input.slackAssetTypes ?? []) {
    if (!types.has(type)) {
      throw new IsomerError(
        'UNKNOWN_PRIMITIVE_TYPE',
        `primitive pack "${input.id}": slackAssetTypes names primitive type "${type}", which the pack does not register`
      );
    }
  }
  const styleCollector =
    input.styleCollector ?? input.styleAdapter?.styleCollector;

  return {
    id: input.id,
    surfaces: input.surfaces ?? [],
    primitives: input.primitives,
    types,
    icons: iconsByType(input.primitives),
    enhancements: input.enhancements ?? [],
    slackAssetTypes: new Set(input.slackAssetTypes ?? []),
    ...(input.styleAdapter !== undefined
      ? { styleAdapter: input.styleAdapter }
      : {}),
    ...(styleCollector !== undefined ? { styleCollector } : {}),
    ...(input.authoring !== undefined ? { authoring: input.authoring } : {}),
  };
};

/** Each definition's `icon` by type, null-prototype so a type such as `__proto__` is an ordinary key. */
export const iconsByType = (
  primitives: readonly AnyPrimitiveDefinition[]
): Readonly<Record<string, PrimitiveIcon>> => {
  const icons = Object.create(null) as Record<string, PrimitiveIcon>;
  for (const { type, icon } of primitives) {
    if (icon !== undefined) {
      icons[type] = icon;
    }
  }
  return Object.freeze(icons);
};

/** Throws if `primitives` repeats a type. */
const assertUniquePrimitiveTypes = (
  id: string,
  primitives: readonly AnyPrimitiveDefinition[]
): void => {
  const seen = new Set<string>();
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

/** Throws if a group names a type outside `types`, or two groups share a type. */
const assertGroupedOnce = (
  id: string,
  groups: readonly PrimitiveGroup[],
  types: ReadonlySet<string>
): void => {
  const grouped = new Set<string>();
  for (const { title, types: members } of groups) {
    for (const type of members) {
      if (!types.has(type)) {
        throw new IsomerError(
          'UNKNOWN_PRIMITIVE_TYPE',
          `primitive pack "${id}": group "${title}" names primitive type "${type}", which the pack does not register`
        );
      }
      if (grouped.has(type)) {
        throw new IsomerError(
          'DUPLICATE_PRIMITIVE_TYPE',
          `primitive pack "${id}": primitive type "${type}" is in two groups`
        );
      }
      grouped.add(type);
    }
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
