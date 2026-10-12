/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const collectTypes = (
  value: unknown,
  knownTypes: ReadonlySet<string>,
  found: Set<string>
): void => {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTypes(item, knownTypes, found);
    }
    return;
  }
  if (typeof value !== 'object' || value === null) {
    return;
  }
  const { type } = value as { type?: unknown };
  if (typeof type === 'string' && knownTypes.has(type)) {
    found.add(type);
  }
  for (const child of Object.values(value)) {
    collectTypes(child, knownTypes, found);
  }
};

/**
 * Whether `value` uses any of `expected` anywhere in its tree, not only at the top of `body`.
 *
 * A pack whose frame wraps every answer in one container, such as a slide, puts the choice that matters below it.
 */
export const scoreExpectedPrimitives = (
  value: unknown,
  expected: readonly string[],
  knownTypes: ReadonlySet<string>
): { hit: boolean; used: string[] } => {
  const found = new Set<string>();
  collectTypes(value, knownTypes, found);
  const used = [...found].sort();
  return { hit: expected.some((type) => found.has(type)), used };
};
