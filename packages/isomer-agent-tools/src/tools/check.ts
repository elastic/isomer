/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Composition,
  formatValidationError,
  type ValidationError,
} from '@elastic/isomer-sdk';

import type {
  IsomerToolsFrame,
  IsomerToolsRuntime,
  IsomerToolsWarning,
} from './types';

/** The outcome of {@link checkComposition}, worded for a model to act on. */
export interface CompositionCheck {
  valid: boolean;
  /** {@link CompositionCheck.findings} as `formatValidationError` strings. */
  errors: string[];
  /** Every error with its path and node type, for a host that renders findings itself. A frame rule's finding has an empty path. */
  findings: ValidationError[];
  warnings: string[];
  /** The parsed composition, present whenever it matched the schema. */
  composition?: Composition | undefined;
}

const formatWarning = ({ surface, path, message }: IsomerToolsWarning) =>
  `${surface}: ${formatValidationError({ path: path ?? '', message })}`;

/** Parses `value`, then runs the runtime's semantic validation and the frame's body rule on what parsed. */
export const checkComposition = (
  runtime: Pick<IsomerToolsRuntime, 'parse' | 'validate'>,
  frame: IsomerToolsFrame | undefined,
  value: unknown
): CompositionCheck => {
  const parsed = runtime.parse(value);
  const { composition } = parsed;
  if (!parsed.valid || composition === undefined) {
    const findings = [...parsed.errors];
    return {
      valid: false,
      errors: findings.map(formatValidationError),
      findings,
      warnings: [],
    };
  }
  const { errors, warnings = [] } = runtime.validate(composition);
  const findings: ValidationError[] = [
    ...errors,
    ...(frame?.validateBody?.(composition.body) ?? []).map((message) => ({
      path: '',
      message,
    })),
  ];
  return {
    valid: findings.length === 0,
    errors: findings.map(formatValidationError),
    findings,
    warnings: warnings.map(formatWarning),
    composition,
  };
};
