/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOMER_ERROR_CODES } from './error';

/**
 * One fatal validation finding.
 *
 * `path` locates the offending value (`body[3].items[0].label`) and is empty
 * for a finding about the document as a whole. `message` is a predicate
 * (`is required`, `must be one of: a, b`) so the two read as one sentence
 * through {@link formatValidationError}.
 */
export interface ValidationError {
  path: string;
  message: string;
}

/** `<path> <message>`, or the message alone for a root finding. */
export const formatValidationError = ({
  path,
  message,
}: ValidationError): string => (path ? `${path} ${message}` : message);

/**
 * Thrown when a `Composition` fails validation, carrying every finding
 * rather than only the first.
 *
 * Identify it by `name`, `code`, and `errors`, never `instanceof`: the SDK
 * ships both ESM and CJS builds, so a host can hold two copies of this class
 * and an identity check would miss one.
 */
export class CompositionValidationError extends Error {
  readonly code = ISOMER_ERROR_CODES.COMPOSITION_INVALID;
  readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      `Invalid Composition:\n  ${
        errors.map(formatValidationError).join('\n  ') || '(no detail)'
      }`
    );
    this.name = 'CompositionValidationError';
    this.errors = errors;
  }
}
