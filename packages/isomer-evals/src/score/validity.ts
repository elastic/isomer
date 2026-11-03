/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValidationError } from '@elastic/isomer-sdk';
import {
  checkComposition,
  type CompositionCheck,
} from '@elastic/isomer-sdk/author';

import type { EvalFrame, EvalRuntime, ValidityScore } from '../types';

/** Model output with the code fence some models wrap JSON in removed. */
export const stripCodeFence = (raw: string): string => {
  const isValidHeader = (opening: number, headerEnd: number): boolean => {
    let start = opening + 3;
    if (raw.startsWith('json', start)) {
      start += 4;
    }
    for (let index = start; index < headerEnd; index += 1) {
      const character = raw[index]!;
      if (character.trim() !== '') {
        return false;
      }
    }
    return true;
  };
  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const opening = raw.indexOf('```', searchFrom);
    if (opening === -1) {
      break;
    }

    const headerEnd = raw.indexOf('\n', opening + 3);
    if (headerEnd === -1) {
      break;
    }
    let candidate = opening;
    if (!isValidHeader(candidate, headerEnd)) {
      candidate = raw.lastIndexOf('```', headerEnd - 1);
      if (candidate <= opening || !isValidHeader(candidate, headerEnd)) {
        searchFrom = headerEnd + 1;
        continue;
      }
    }

    const closing = raw.indexOf('```', headerEnd + 1);
    if (closing === -1) {
      return raw.trim();
    }
    return raw.slice(headerEnd + 1, closing).trim();
  }
  return raw.trim();
};

/** One `generate` call's output, parsed from JSON exactly once. `raw` is the text as the model sent it. */
export type ParsedAttempt =
  | { parsed: true; raw: string; value: unknown }
  | { parsed: false; raw: string; error: string };

/** Parses model output as JSON, reporting failure rather than throwing. */
export const parseGenerated = (raw: string): ParsedAttempt => {
  try {
    return { parsed: true, raw, value: JSON.parse(stripCodeFence(raw)) };
  } catch (error) {
    return {
      parsed: false,
      raw,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

/** A {@link ParsedAttempt} with its value checked exactly once; output that did not parse has nothing to check. */
export type CheckedAttempt =
  | { parsed: true; raw: string; value: unknown; check: CompositionCheck }
  | { parsed: false; raw: string; error: string };

/** Runs the SDK's `checkComposition` over an attempt's value, once. */
export const checkAttempt = (
  runtime: EvalRuntime,
  attempt: ParsedAttempt,
  frame?: EvalFrame
): CheckedAttempt =>
  attempt.parsed
    ? { ...attempt, check: checkComposition(runtime, attempt.value, frame) }
    : attempt;

/**
 * Scores one case's validity from attempts that were each parsed and checked
 * once. Pure: {@link checkAttempt} has already consulted the runtime, so the
 * retry decision and this score read the same check rather than repeating it.
 */
export const scoreValidity = (
  attempt: CheckedAttempt,
  retryAttempt?: CheckedAttempt
): ValidityScore => {
  const retried = retryAttempt?.parsed ? retryAttempt.check : undefined;
  if (!attempt.parsed) {
    return {
      parsed: false,
      valid: false,
      validAfterRetry: retried?.valid ?? false,
      errors: [attempt.error],
      composition: retried?.valid ? retried.composition : undefined,
    };
  }

  const first = attempt.check;
  if (first.valid) {
    return {
      parsed: true,
      valid: true,
      validAfterRetry: true,
      errors: [],
      composition: first.composition,
    };
  }

  return {
    parsed: true,
    valid: false,
    validAfterRetry: retried?.valid ?? false,
    errors: first.errors.map(formatValidationError),
    composition: retried?.valid ? retried.composition : undefined,
  };
};
