/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A pack's vocabulary version, the chain of steps that carries a stored
// document from each earlier version to the next, and the types a pack owns
// through them. Upgrading a document runs the chain; nothing here reads one.

import type { ChildNodeRef } from '../composition/body_node_base';
import type { Composition, PackVersions } from '../composition/composition';
import { IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../composition/node';

/**
 * The shape of `PrimitiveDefinition` and `PrimitivePack` this SDK runs. Raised
 * only when they change in a way that stops a pack built by an earlier SDK
 * from running; `composePacks` refuses a pack built for any other contract
 * with `INCOMPATIBLE_PACK_CONTRACT`.
 */
export const PACK_CONTRACT_VERSION = 1;

/**
 * One step of a pack's migrations: what changes between version `k` and
 * `k + 1`. Every key is a node `type` as it was at version `k`.
 */
export interface PackMigration {
  /** Old node `type` to transform. Returning `null` deletes the node. */
  nodes?: Readonly<
    Record<string, (node: PrimitiveNode) => PrimitiveNode | null>
  >;
  /**
   * Child slots at the source version, for every type whose slots differ from
   * the current definition, including types that no longer exist. A renamed
   * container needs one even when its slots did not move.
   */
  children?: Readonly<
    Record<string, (node: PrimitiveNode) => readonly ChildNodeRef[]>
  >;
  /** Whole-document step, run after `nodes`. */
  composition?: (composition: Composition) => Composition;
}

/** A pack's steps by source version: key `k` migrates `k` to `k + 1`. */
export type PackMigrations = Readonly<Record<number, PackMigration>>;

/** What {@link ownedTypes} and the version checks read from a pack. */
interface VersionedPack {
  readonly id: string;
  readonly version?: number;
  readonly migrations?: PackMigrations;
  readonly contract?: number;
  readonly primitives: readonly { readonly type: string }[];
}

const isPositiveInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) >= 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Throws `INVALID_PACK_VERSION` unless `version` is absent or a positive integer. */
export const assertPackVersion = (id: string, version: unknown): void => {
  if (version !== undefined && !isPositiveInteger(version)) {
    throw new IsomerError(
      'INVALID_PACK_VERSION',
      `primitive pack "${id}": version must be a positive integer, got ${typeof version === 'number' || typeof version === 'bigint' ? version.toString() : JSON.stringify(version)}`
    );
  }
};

const assertFunctions = (
  id: string,
  step: string,
  field: 'nodes' | 'children',
  entries: unknown
): void => {
  if (entries === undefined) {
    return;
  }
  if (!isRecord(entries)) {
    throw invalidMigrations(
      id,
      `migrations[${step}].${field} must be an object`
    );
  }
  for (const [type, transform] of Object.entries(entries)) {
    if (typeof transform !== 'function') {
      throw invalidMigrations(
        id,
        `migrations[${step}].${field}.${type} must be a function`
      );
    }
  }
};

const invalidMigrations = (id: string, detail: string): IsomerError =>
  new IsomerError(
    'INVALID_PACK_MIGRATIONS',
    `primitive pack "${id}": ${detail}`
  );

const MISSING_LISTED = 5;

/** The first missing steps, so the scan stays bounded by the keys a pack supplies. */
const listMissing = (
  migrations: Record<string, unknown>,
  count: number
): string => {
  const listed: number[] = [];
  for (let step = 1; listed.length < Math.min(count, MISSING_LISTED); step++) {
    if (!Object.hasOwn(migrations, String(step))) {
      listed.push(step);
    }
  }
  return count > listed.length
    ? `${listed.join(', ')}, … (${count} in all)`
    : listed.join(', ');
};

/**
 * Throws `INVALID_PACK_MIGRATIONS` unless `migrations` holds one step for each
 * of `1 .. version - 1` and nothing else, each a {@link PackMigration}.
 */
export const assertPackMigrations = (
  id: string,
  version: number,
  migrations: unknown
): void => {
  if (migrations === undefined) {
    migrations = {};
  }
  if (!isRecord(migrations)) {
    throw invalidMigrations(id, 'migrations must be an object');
  }
  const keys = Object.keys(migrations);
  const isStep = (key: string) =>
    /^[1-9]\d*$/.test(key) && Number(key) < version;
  const steps = keys.filter(isStep);
  const unexpected = keys.filter((key) => !isStep(key));
  const missingCount = version - 1 - steps.length;
  if (missingCount > 0 || unexpected.length > 0) {
    const range =
      version === 1 ? 'none, at version 1' : `exactly 1..${version - 1}`;
    throw invalidMigrations(
      id,
      `migrations keys must be ${range}, one per step to version ${version}${missingCount > 0 ? `; missing ${listMissing(migrations, missingCount)}` : ''}${unexpected.length > 0 ? `; unexpected ${unexpected.map((key) => JSON.stringify(key)).join(', ')}` : ''}`
    );
  }
  for (const step of steps) {
    const migration = migrations[step];
    if (!isRecord(migration)) {
      throw invalidMigrations(id, `migrations[${step}] must be an object`);
    }
    assertFunctions(id, step, 'nodes', migration.nodes);
    assertFunctions(id, step, 'children', migration.children);
    if (
      migration.composition !== undefined &&
      typeof migration.composition !== 'function'
    ) {
      throw invalidMigrations(
        id,
        `migrations[${step}].composition must be a function`
      );
    }
  }
};

/**
 * Throws `INCOMPATIBLE_PACK_CONTRACT` unless the pack was built for this SDK's
 * {@link PACK_CONTRACT_VERSION}. A pack that predates the field is contract 1.
 */
export const assertPackContract = (pack: VersionedPack): void => {
  const contract = pack.contract ?? 1;
  if (contract !== PACK_CONTRACT_VERSION) {
    throw new IsomerError(
      'INCOMPATIBLE_PACK_CONTRACT',
      `primitive pack "${pack.id}" was built for pack contract ${String(contract)}; this SDK runs contract ${PACK_CONTRACT_VERSION}`
    );
  }
};

/**
 * Every type a pack owns, mapped to where it owns it: `current` for a type it
 * registers, otherwise the first step whose `nodes` or `children` names it.
 */
export const typeOwnership = (
  pack: VersionedPack
): ReadonlyMap<string, 'current' | number> => {
  const owned = new Map<string, 'current' | number>();
  for (const { type } of pack.primitives) {
    owned.set(type, 'current');
  }
  const steps = Object.keys(pack.migrations ?? {})
    .map(Number)
    .sort((a, b) => a - b);
  for (const step of steps) {
    const migration = pack.migrations?.[step];
    for (const type of [
      ...Object.keys(migration?.nodes ?? {}),
      ...Object.keys(migration?.children ?? {}),
    ]) {
      if (!owned.has(type)) {
        owned.set(type, step);
      }
    }
  }
  return owned;
};

/**
 * The node types a pack owns: the ones it registers now, plus every type a
 * migration step names. No two composed packs may own the same type, so a
 * retired name keeps its meaning in stored documents.
 */
export const ownedTypes = (pack: VersionedPack): ReadonlySet<string> =>
  new Set(typeOwnership(pack).keys());

/** Each pack's version by id, reading a pack that predates versions as 1. */
export const packVersionsOf = (
  packs: readonly Pick<VersionedPack, 'id' | 'version'>[]
): PackVersions =>
  Object.fromEntries(packs.map(({ id, version }) => [id, version ?? 1]));
