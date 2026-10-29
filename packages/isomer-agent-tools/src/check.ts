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
import { checkComposition as check } from '@elastic/isomer-sdk/author';

import type { IsomerToolsFrame, IsomerToolsRuntime } from './types';

/** The outcome of {@link checkComposition}, worded for a model to act on. */
export interface IsomerCompositionCheck {
  valid: boolean;
  /** `findings` through `formatValidationError`. */
  errors: string[];
  /** A frame rule's finding has an empty path. */
  findings: ValidationError[];
  warnings: string[];
  /** The copy `validate` checked, absent when `validate` found errors. */
  composition?: Composition | undefined;
}

// A warning's message may already open with its path.
const formatWarning = ({ surface, path = '', message }: ValidationWarning) =>
  `${surface}: ${message.startsWith(path) ? message : formatValidationError({ path, message })}`;

/** The SDK's `checkComposition`, with its findings and warnings formatted for a model. */
export const checkComposition = (
  runtime: Pick<IsomerToolsRuntime, 'validate'>,
  frame: IsomerToolsFrame | undefined,
  value: unknown
): IsomerCompositionCheck => {
  const { valid, errors, warnings, composition } = check(runtime, value, frame);
  return {
    valid,
    errors: errors.map(formatValidationError),
    findings: [...errors],
    warnings: warnings.map(formatWarning),
    composition,
  };
};
