/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Composition, formatValidationError } from '@elastic/isomer-sdk';

import type {
  IsomerToolsFrame,
  IsomerToolsRuntime,
  IsomerToolsWarning,
} from './types';

/** The outcome of {@link checkComposition}, worded for a model to act on. */
export interface CompositionCheck {
  valid: boolean;
  errors: string[];
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
    return {
      valid: false,
      errors: parsed.errors.map(formatValidationError),
      warnings: [],
    };
  }
  const { errors, warnings = [] } = runtime.validate(composition);
  const allErrors = [
    ...errors.map(formatValidationError),
    ...(frame?.validateBody?.(composition.body) ?? []),
  ];
  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: warnings.map(formatWarning),
    composition,
  };
};
