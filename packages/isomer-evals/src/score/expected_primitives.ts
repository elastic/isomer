/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalRuntime } from '../types';

import { collectNodeTypes } from './node_types';

/**
 * Whether `value` uses any of `expected` as a node anywhere in its body, not only at the top.
 *
 * A pack whose frame wraps every answer in one container, such as a slide, puts the choice that matters below it.
 */
export const scoreExpectedPrimitives = (
  runtime: Pick<EvalRuntime, 'primitives'>,
  value: unknown,
  expected: readonly string[]
): { hit: boolean; used: string[] } => {
  const known = new Set(runtime.primitives.map(({ type }) => type));
  const used = [...collectNodeTypes(runtime, value)]
    .filter((type) => known.has(type))
    .sort();
  return { hit: expected.some((type) => used.includes(type)), used };
};
