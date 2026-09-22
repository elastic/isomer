/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Composition, createChildNodeWalker } from '@elastic/isomer-sdk';

import type { EvalRuntime, PayloadScore } from '../types';

import type { CheckedAttempt } from './validity';

const bytes = (value: unknown): number =>
  Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');

/**
 * Collects `type` from actual node positions only — the root and its `body`,
 * walked through each container's own `children` hook — rather than every
 * `type` string anywhere in the value. A primitive's own data can carry a
 * `type` field with no relation to the node vocabulary (chart data shaped
 * like `{ type: 'bar' }`), and that is not an invented primitive.
 */
const collectTypes = (
  nodes: readonly unknown[],
  walk: ReturnType<typeof createChildNodeWalker>,
  found: Set<string>
): void => {
  for (const node of nodes) {
    if (!node || typeof node !== 'object') {
      continue;
    }
    const { type } = node as { type?: unknown };
    if (typeof type === 'string') {
      found.add(type);
    }
    collectTypes(
      walk(node).map((ref) => ref.node),
      walk,
      found
    );
  }
};

/**
 * How much of what the model sent survives parsing.
 *
 * `rawBytes` measures the text as the model sent it; `sanitizedBytes` measures
 * the composition the schema kept. The gap is the model inventing properties
 * the schema drops — wasted tokens that also signal the catalog under-describes
 * the shape it wanted.
 */
export const scorePayload = (
  runtime: EvalRuntime,
  attempt: CheckedAttempt,
  knownTypes: ReadonlySet<string>,
  golden?: Composition
): PayloadScore => {
  const attempted = new Set<string>();
  const value = attempt.parsed ? attempt.value : undefined;
  const body = (value as { body?: unknown } | null | undefined)?.body;
  collectTypes(
    Array.isArray(body) ? body : [],
    createChildNodeWalker(runtime.primitives),
    attempted
  );

  const unknownTypes = [...attempted]
    .filter((type) => !knownTypes.has(type))
    .sort();

  const rawBytes = Buffer.byteLength(attempt.raw, 'utf8');
  const composition = attempt.parsed ? attempt.check.composition : undefined;
  const sanitizedBytes = composition ? bytes(composition) : 0;
  const goldenBytes = golden ? bytes(golden) : undefined;

  return {
    rawBytes,
    sanitizedBytes,
    sizeVsGolden:
      goldenBytes && goldenBytes > 0 ? sanitizedBytes / goldenBytes : undefined,
    unknownTypes,
  };
};
