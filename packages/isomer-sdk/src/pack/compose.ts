/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IsomerError } from '../composition/error';
import type { PrimitiveIcon } from '../define/primitive_icon';
import type { AnyPrimitiveDefinition } from '../define/primitive_module';

import type { EnhancementDefinition } from './enhancements';
import { type AnyPrimitivePack, iconsByType } from './primitive_pack';

/**
 * One flattened inventory owned by {@link composePacks}.
 *
 * `definitions` is a stable array identity, which is what the composition
 * schema cache keys on — pass it through rather than flattening packs per call.
 */
export interface ComposedPacks {
  readonly definitions: readonly AnyPrimitiveDefinition[];
  readonly enhancements: readonly EnhancementDefinition[];
  /** Every definition's `icon` by type, in one frozen null-prototype dictionary. */
  readonly icons: Readonly<Record<string, PrimitiveIcon>>;
  readonly slackAssetTypes: ReadonlySet<string>;
}

/**
 * Flattens `packs` into one inventory, rejecting cross-pack duplicate node
 * types and duplicate enhancement ids. Every offender is named in one error,
 * so a bad three-pack composition reports all three at once.
 */
export const composePacks = (
  packs: readonly AnyPrimitivePack[]
): ComposedPacks => {
  const typeOwners = new Map<string, string[]>();
  const enhancementOwners = new Map<string, string[]>();
  for (const pack of packs) {
    for (const { type } of pack.primitives) {
      typeOwners.set(type, [...(typeOwners.get(type) ?? []), pack.id]);
    }
    for (const { id } of pack.enhancements) {
      enhancementOwners.set(id, [
        ...(enhancementOwners.get(id) ?? []),
        pack.id,
      ]);
    }
  }
  const repeated = [
    ...new Set(
      packs
        .map(({ id }) => id)
        .filter((id, index, ids) => ids.indexOf(id) !== index)
    ),
  ];
  if (repeated.length > 0) {
    throw new IsomerError(
      'DUPLICATE_PACK_ID',
      `composePacks: ${repeated.map((id) => `"${id}"`).join(', ')} names more than one pack; pack ids must be unique`
    );
  }
  assertUnique('DUPLICATE_PRIMITIVE_TYPE', 'primitive type', typeOwners);
  assertUnique('DUPLICATE_ENHANCEMENT', 'enhancement', enhancementOwners);

  const definitions = packs.flatMap((pack) => [...pack.primitives]);
  return Object.freeze({
    definitions: Object.freeze(definitions),
    enhancements: Object.freeze(
      packs.flatMap((pack) => [...pack.enhancements])
    ),
    icons: iconsByType(definitions),
    slackAssetTypes: new Set(
      packs.flatMap((pack) => [...pack.slackAssetTypes])
    ),
  });
};

const assertUnique = (
  code: 'DUPLICATE_ENHANCEMENT' | 'DUPLICATE_PRIMITIVE_TYPE',
  noun: string,
  owners: ReadonlyMap<string, readonly string[]>
): void => {
  const duplicates = [...owners].filter(([, packs]) => packs.length > 1);
  if (duplicates.length === 0) {
    return;
  }
  throw new IsomerError(
    code,
    duplicates
      .map(
        ([key, packs]) =>
          `${noun} "${key}" registered by ${packs.map((id) => `"${id}"`).join(' and ')}`
      )
      .join('; ')
  );
};
