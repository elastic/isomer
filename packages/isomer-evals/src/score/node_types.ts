/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createChildNodeWalker } from '@elastic/isomer-sdk';

import type { EvalRuntime } from '../types';

/** A node to walk, or the end of one whose children have all been walked. */
type Step = { enter: unknown } | { leave: object };

/**
 * The type of every node under a value's `body`, once per occurrence, reached through pack child hooks; data fields named `type` are not nodes.
 *
 * A node reachable twice counts twice, as its JSON would; one that contains itself is walked once. Iterative, so an arbitrarily deep answer cannot overflow the stack.
 */
export const walkNodeTypes = (
  runtime: Pick<EvalRuntime, 'primitives'>,
  value: unknown
): string[] => {
  const found: string[] = [];
  const body = (value as { body?: unknown } | null | undefined)?.body;
  const walk = createChildNodeWalker(runtime.primitives);
  const steps: Step[] = Array.isArray(body)
    ? (body as unknown[]).map((node) => ({ enter: node })).reverse()
    : [];
  const path = new Set<object>();
  for (let step = steps.pop(); step !== undefined; step = steps.pop()) {
    if ('leave' in step) {
      path.delete(step.leave);
      continue;
    }
    const { enter: node } = step;
    if (!node || typeof node !== 'object' || path.has(node)) {
      continue;
    }
    const { type } = node as { type?: unknown };
    if (typeof type === 'string') {
      found.push(type);
    }
    path.add(node);
    steps.push({ leave: node });
    try {
      for (const { node: child } of walk(node)) {
        steps.push({ enter: child });
      }
    } catch {
      // Child hooks require schema-valid nodes; malformed branches have no known child positions.
      continue;
    }
  }
  return found;
};

/** The distinct node types {@link walkNodeTypes} finds. */
export const collectNodeTypes = (
  runtime: Pick<EvalRuntime, 'primitives'>,
  value: unknown
): Set<string> => new Set(walkNodeTypes(runtime, value));
