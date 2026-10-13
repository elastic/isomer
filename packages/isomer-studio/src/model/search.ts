/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveDoc } from './describe_runtime';

/** Primitives matching every word of `query`, those matching by name first. */
export const searchPrimitives = (
  primitives: readonly PrimitiveDoc[],
  query: string
): PrimitiveDoc[] => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [...primitives];
  }

  const scored = primitives.flatMap((doc) => {
    const { type, label, purpose, useWhen, avoidWhen } = doc;
    const name = `${type} ${label}`.toLowerCase();
    const text = [name, purpose, ...useWhen, ...avoidWhen]
      .join(' ')
      .toLowerCase();
    if (!words.every((word) => text.includes(word))) {
      return [];
    }
    return [{ doc, byName: words.every((word) => name.includes(word)) }];
  });

  return [
    ...scored.filter(({ byName }) => byName),
    ...scored.filter(({ byName }) => !byName),
  ].map(({ doc }) => doc);
};
