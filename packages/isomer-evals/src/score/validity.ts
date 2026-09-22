/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Composition, formatValidationError } from '@elastic/isomer-sdk';

import type { EvalRuntime, ValidityScore } from '../types';

/** Model output with the code fence some models wrap JSON in removed. */
export const stripCodeFence = (raw: string): string => {
  const fenced = raw.match(/```(?:json)?\s*\n([\s\S]*?)\s*```/);
  return (fenced?.[1] ?? raw).trim();
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

export interface CheckedComposition {
  valid: boolean;
  errors: readonly string[];
  composition?: Composition | undefined;
}

/**
 * Parses `value` against the runtime's schema, then validates the result —
 * the one place both happen together, so a value that parses but fails
 * validation (duplicate ids, for instance) is never mistaken for a good
 * composition by only half of this check.
 */
export const checkComposition = (
  runtime: EvalRuntime,
  value: unknown
): CheckedComposition => {
  const parsed = runtime.parse(value);
  if (!parsed.valid || !parsed.composition) {
    return { valid: false, errors: parsed.errors.map(formatValidationError) };
  }
  const result = runtime.validate(parsed.composition);
  return {
    valid: result.valid,
    errors: result.valid ? [] : result.errors.map(formatValidationError),
    composition: parsed.composition,
  };
};

/** A {@link ParsedAttempt} with its value checked exactly once; output that did not parse has nothing to check. */
export type CheckedAttempt =
  | { parsed: true; raw: string; value: unknown; check: CheckedComposition }
  | { parsed: false; raw: string; error: string };

/** Runs {@link checkComposition} over an attempt's value, once. */
export const checkAttempt = (
  runtime: EvalRuntime,
  attempt: ParsedAttempt
): CheckedAttempt =>
  attempt.parsed
    ? { ...attempt, check: checkComposition(runtime, attempt.value) }
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
      composition: retried?.composition,
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
    errors: first.errors,
    composition: retried?.composition ?? first.composition,
  };
};
