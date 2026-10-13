/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChildNodeWalker } from '@elastic/isomer-sdk';

import type { EvalRuntime } from '../types';

/**
 * The node types under a value's `body`, reached through pack child hooks; data fields named `type` are not nodes.
 *
 * Iterative, so an arbitrarily deep answer cannot overflow the stack.
 */
export const collectNodeTypes = (
  runtime: Pick<EvalRuntime, 'primitives'>,
  value: unknown
): Set<string> => {
  const found = new Set<string>();
  const body = (value as { body?: unknown } | null | undefined)?.body;
  const walk = createChildNodeWalker(runtime.primitives);
  const pending: unknown[] = Array.isArray(body)
    ? [...(body as unknown[])]
    : [];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node || typeof node !== 'object' || seen.has(node)) {
      continue;
    }
    seen.add(node);
    const { type } = node as { type?: unknown };
    if (typeof type === 'string') {
      found.add(type);
    }
    try {
      for (const { node: child } of walk(node)) {
        pending.push(child);
      }
    } catch {
      // Child hooks require schema-valid nodes; malformed branches have no known child positions.
      continue;
    }
  }
  return found;
};
