/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FEATURED_COUNT } from '../config';

import type { PrimitiveDoc } from './describe_runtime';

/**
 * The primitives Home features: the config's `featured`, in its order, skipping types the runtime lacks;
 * or, without one, up to {@link FEATURED_COUNT} drawn at random without repeats.
 */
export const pickFeatured = (
  primitives: readonly PrimitiveDoc[],
  featured: readonly string[] | undefined,
  random: () => number = Math.random
): PrimitiveDoc[] => {
  if (featured !== undefined) {
    return featured.flatMap((type) => {
      const doc = primitives.find((candidate) => candidate.type === type);
      return doc ? [doc] : [];
    });
  }
  const pool = [...primitives];
  const picked: PrimitiveDoc[] = [];
  while (pool.length && picked.length < FEATURED_COUNT) {
    const [doc] = pool.splice(Math.floor(random() * pool.length), 1);
    if (doc) {
      picked.push(doc);
    }
  }
  return picked;
};

/** The primitive types a runtime reports, or none when `runtime` is not one; `featuredProblems` then names every entry. */
export const runtimePrimitiveTypes = (runtime: unknown): string[] => {
  const primitives =
    typeof runtime === 'object' && runtime !== null && 'primitives' in runtime
      ? runtime.primitives
      : undefined;
  return Array.isArray(primitives)
    ? primitives.flatMap((definition: unknown) =>
        typeof definition === 'object' &&
        definition !== null &&
        'type' in definition &&
        typeof definition.type === 'string'
          ? [definition.type]
          : []
      )
    : [];
};

/** What is wrong with a config's `featured`, one line per problem. Runs in Node and the browser. */
export const featuredProblems = (
  featured: unknown,
  types: readonly string[]
): string[] => {
  if (featured === undefined) {
    return [];
  }
  if (!Array.isArray(featured)) {
    return ['featured must be an array of primitive types.'];
  }
  const problems: string[] = [];
  const seen = new Set<string>();
  featured.forEach((type: unknown, index) => {
    if (typeof type !== 'string') {
      problems.push(`featured[${index}] must be a primitive type.`);
      return;
    }
    if (!types.includes(type)) {
      problems.push(
        `featured[${index}] ("${type}") names no primitive in the runtime.`
      );
    } else if (seen.has(type)) {
      problems.push(`featured[${index}] ("${type}") repeats an earlier entry.`);
    } else {
      seen.add(type);
    }
  });
  return problems;
};
