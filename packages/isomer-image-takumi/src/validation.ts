/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A validation result shaped like the SDK's `ValidationResult`, declared structurally. */
export interface ValidationResult {
  valid: boolean;
  errors: readonly unknown[];
}

/** What `runtime.validate` returns: findings, and the copy they describe, `undefined` only for refused input. */
export type CheckedValidationResult = ValidationResult & {
  composition: unknown;
};

/** @deprecated Use {@link ValidationResult}. */
export type PngValidationResult = ValidationResult;

/** @deprecated Use {@link CheckedValidationResult}. */
export type PngCheckedValidationResult = CheckedValidationResult;

/**
 * Splits a {@link CheckedValidationResult} into the copy to draw and the findings to report.
 *
 * Throws rather than draw the caller's value: shaped as the SDK's
 * `CompositionValidationError` when the runtime refused the input, and a plain
 * `Error` when the runtime returned no copy at all.
 */
export const checkedForDrawing = (
  caller: string,
  { composition, ...validation }: CheckedValidationResult
): { checked: unknown; validation: ValidationResult } => {
  if (composition !== undefined) {
    return { checked: composition, validation };
  }
  if (validation.valid) {
    throw new Error(
      `${caller}: runtime.validate returned no checked composition to draw`
    );
  }
  throw Object.assign(
    new Error(`${caller}: the runtime refused the composition before parsing`),
    {
      name: 'CompositionValidationError',
      code: 'COMPOSITION_INVALID',
      errors: validation.errors,
    }
  );
};
