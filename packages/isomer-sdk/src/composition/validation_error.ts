/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ISOMER_ERROR_CODES } from './error';
import { nameText } from './one_line';

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
  /** The `type` of the innermost primitive node `path` lands in, when there is one. */
  nodeType?: string;
}

/** `<path> (in <nodeType>) <message>`, or the message alone for a root finding. */
export const formatValidationError = ({
  path,
  message,
  nodeType,
}: ValidationError): string => {
  if (!path) {
    return message;
  }
  return nodeType === undefined
    ? `${path} ${message}`
    : `${path} (in ${nameText(nodeType)}) ${message}`;
};

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
