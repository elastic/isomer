/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { EvalRuntime, PayloadScore } from '../types';

import { collectNodeTypes } from './node_types';
import type { CheckedAttempt } from './validity';

const bytes = (value: unknown): number =>
  Buffer.byteLength(JSON.stringify(value) ?? '', 'utf8');

/**
 * How much of what the model sent survives validation.
 *
 * `rawBytes` measures the text as the model sent it; `sanitizedBytes` measures
 * the copy `validate` checked, or `0` when it found errors. Reads the first
 * attempt only; a retry does not change this score.
 */
export const scorePayload = (
  runtime: EvalRuntime,
  attempt: CheckedAttempt,
  knownTypes: ReadonlySet<string>,
  golden?: Composition
): PayloadScore => {
  const attempted = collectNodeTypes(
    runtime,
    attempt.parsed ? attempt.value : undefined
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
