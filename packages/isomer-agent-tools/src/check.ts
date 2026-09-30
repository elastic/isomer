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
  type ValidationWarning,
} from '@elastic/isomer-sdk';

import { overInputBudget } from './budget';
import type { IsomerToolsFrame, IsomerToolsRuntime } from './types';

/** The outcome of {@link checkComposition}, worded for a model to act on. */
export interface IsomerCompositionCheck {
  valid: boolean;
  /** `findings` through `formatValidationError`. */
  errors: string[];
  /** A frame rule's finding has an empty path. */
  findings: ValidationError[];
  warnings: string[];
  /** Present whenever the value matched the schema. */
  composition?: Composition | undefined;
}

// A warning's message may already open with its path.
const formatWarning = ({ surface, path = '', message }: ValidationWarning) =>
  `${surface}: ${message.startsWith(path) ? message : formatValidationError({ path, message })}`;

const refused = (findings: ValidationError[]): IsomerCompositionCheck => ({
  valid: false,
  errors: findings.map(formatValidationError),
  findings,
  warnings: [],
});

/** Refuses `value` over the input budget, then parses it and runs the runtime's semantic validation and the frame's body rule on what parsed. */
export const checkComposition = (
  runtime: Pick<IsomerToolsRuntime, 'parse' | 'validate'>,
  frame: IsomerToolsFrame | undefined,
  value: unknown
): IsomerCompositionCheck => {
  const over = overInputBudget(value);
  if (over !== undefined) {
    return refused([{ path: '', message: over }]);
  }
  const parsed = runtime.parse(value);
  const { composition } = parsed;
  if (!parsed.valid || composition === undefined) {
    return refused([...parsed.errors]);
  }
  const { errors, warnings } = runtime.validate(composition);
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
