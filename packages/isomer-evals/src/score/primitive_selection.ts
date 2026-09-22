/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { PrimitiveSelectionScore } from '../types';

const topLevelTypes = (composition: Composition): string[] =>
  composition.body.map(({ type }) => type);

const counted = (types: readonly string[]): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const type of types) {
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return counts;
};

/**
 * Multiset precision/recall/F1 of the generated body's node types against the
 * golden's.
 *
 * A multiset rather than a set, so answering a three-stat question with one
 * `statGroup` scores differently from answering it with three. Catalog
 * `useWhen` / `avoidWhen` copy is the tunable this measures.
 */
export const scorePrimitiveSelection = (
  generated: Composition,
  golden: Composition
): PrimitiveSelectionScore => {
  const got = counted(topLevelTypes(generated));
  const want = counted(topLevelTypes(golden));

  let overlap = 0;
  const extra: string[] = [];
  const missing: string[] = [];

  for (const [type, count] of got) {
    const wanted = want.get(type) ?? 0;
    overlap += Math.min(count, wanted);
    for (let i = wanted; i < count; i += 1) {
      extra.push(type);
    }
  }
  for (const [type, count] of want) {
    const gotten = got.get(type) ?? 0;
    for (let i = gotten; i < count; i += 1) {
      missing.push(type);
    }
  }

  const gotTotal = [...got.values()].reduce((sum, n) => sum + n, 0);
  const wantTotal = [...want.values()].reduce((sum, n) => sum + n, 0);
  const precision = gotTotal === 0 ? 0 : overlap / gotTotal;
  const recall = wantTotal === 0 ? 0 : overlap / wantTotal;
  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) / (precision + recall);

  return {
    precision,
    recall,
    f1,
    extra: extra.sort(),
    missing: missing.sort(),
  };
};
