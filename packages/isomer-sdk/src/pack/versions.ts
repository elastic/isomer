/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Which pack versions a composition was written for, and whether a set of
// packs matches them. A host that draws compositions written elsewhere, such as
// a render service, refuses one that does not match rather than drawing it
// against a different vocabulary.

import { createChildNodeWalker } from '../composition/body_node_base';
import type { Composition, PackVersions } from '../composition/composition';

import { type AnyPrimitivePack, packVersionOf } from './primitive_pack';

/** Each pack's version by id. */
export const packVersionsOf = (
  packs: readonly AnyPrimitivePack[]
): PackVersions =>
  Object.fromEntries(packs.map((pack) => [pack.id, packVersionOf(pack)]));

/**
 * Records `versions` on the composition, replacing their entries in any stamp it
 * already carries and keeping entries for other packs.
 */
export const stampPackVersions = <TComposition extends Composition>(
  composition: TComposition,
  versions: PackVersions
): TComposition => ({
  ...composition,
  packs: { ...composition.packs, ...versions },
});

/**
 * How a composition's stamp differs from a set of packs.
 *
 * - `newer`: written for a later version of the pack than the one held.
 * - `older`: written for an earlier version.
 * - `unknown`: stamped with a pack that is not held.
 * - `unstamped`: uses a held pack's node types, but its stamp does not name the pack.
 */
export interface PackVersionMismatch {
  pack: string;
  kind: 'newer' | 'older' | 'unknown' | 'unstamped';
  /** The version the composition was stamped with, when it names the pack. */
  stamped?: number;
  /** The held pack's version, when it is held. */
  held?: number;
}

/** The ids of held packs whose node types appear anywhere in `body`. */
const packsInUse = (
  composition: Composition,
  packs: readonly AnyPrimitivePack[]
): Set<string> => {
  const owner = new Map<string, string>();
  for (const pack of packs) {
    for (const definition of pack.primitives) {
      owner.set(definition.type, pack.id);
    }
  }
  const walk = createChildNodeWalker(packs.flatMap((pack) => pack.primitives));
  const used = new Set<string>();
  const seen = new Set<unknown>();
  const pending: unknown[] = [...composition.body];
  while (pending.length > 0) {
    const node = pending.pop();
    if (typeof node !== 'object' || node === null || seen.has(node)) {
      continue;
    }
    seen.add(node);
    const type = (node as { type?: unknown }).type;
    const id = typeof type === 'string' ? owner.get(type) : undefined;
    if (id !== undefined) {
      used.add(id);
    }
    pending.push(...walk(node).map((child) => child.node));
  }
  return used;
};

/**
 * Every way a composition's pack stamp differs from `packs`, sorted by pack id.
 * Empty means the composition was written for exactly these versions of every
 * pack it uses. Reads only the stamp and node types: run `validate` for the rest.
 */
export const comparePackVersions = (
  composition: Composition,
  packs: readonly AnyPrimitivePack[]
): PackVersionMismatch[] => {
  const held = packVersionsOf(packs);
  const stamp = composition.packs ?? {};
  const mismatches: PackVersionMismatch[] = [];
  for (const [pack, stamped] of Object.entries(stamp)) {
    const current = held[pack];
    if (current === undefined) {
      mismatches.push({ pack, kind: 'unknown', stamped });
    } else if (stamped !== current) {
      mismatches.push({
        pack,
        kind: stamped > current ? 'newer' : 'older',
        stamped,
        held: current,
      });
    }
  }
  for (const pack of packsInUse(composition, packs)) {
    if (!Object.hasOwn(stamp, pack)) {
      mismatches.push({ pack, kind: 'unstamped', held: held[pack] ?? 1 });
    }
  }
  return mismatches.sort((a, b) =>
    a.pack < b.pack ? -1 : a.pack > b.pack ? 1 : 0
  );
};
