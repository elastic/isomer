/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '../composition/composition';
import type { PrimitiveNode } from '../composition/node';
import type { ValidationError } from '../composition/validation_error';
import type { ValidationWarning } from '../validate/validation';

/** The part of a runtime {@link checkComposition} calls. An `IsomerRuntime` satisfies it. */
export interface CompositionCheckRuntime {
  /** `composition` is the schema's output, with defaults and transforms applied; present only when `valid`. */
  parse(value: unknown): {
    valid: boolean;
    errors: readonly ValidationError[];
    composition?: Composition | undefined;
  };
  /** `composition` is the copy the result describes, and `undefined` only when the input budget refused it. */
  validate(composition: Composition): {
    valid: boolean;
    errors: readonly ValidationError[];
    warnings?: readonly ValidationWarning[] | undefined;
    composition: Composition | undefined;
  };
}

/** A body rule the runtime does not enforce on every surface. A `Frame` satisfies it. */
export interface CompositionCheckFrame {
  validateBody?(body: readonly PrimitiveNode[]): readonly string[];
}

/** The outcome of {@link checkComposition}. */
export type CompositionCheck =
  | {
      valid: true;
      errors: readonly [];
      warnings: readonly ValidationWarning[];
      composition: Composition;
    }
  | {
      valid: false;
      /** A frame rule's finding has an empty path. */
      errors: readonly ValidationError[];
      warnings: readonly ValidationWarning[];
      /** The validated copy, present when only the frame's rule failed. */
      composition?: Composition | undefined;
    };

/** Parses a value of unknown shape, validates the parsed copy, then applies the frame's body rule to the copy the runtime checked. */
export const checkComposition = (
  runtime: CompositionCheckRuntime,
  value: unknown,
  frame?: CompositionCheckFrame
): CompositionCheck => {
  const parsed = runtime.parse(value);
  if (!parsed.valid || parsed.composition === undefined) {
    return { valid: false, errors: parsed.errors, warnings: [] };
  }
  const result = runtime.validate(parsed.composition);
  const warnings = result.warnings ?? [];
  const { composition } = result;
  if (!result.valid || composition === undefined) {
    return { valid: false, errors: result.errors, warnings };
  }
  const errors = (frame?.validateBody?.(composition.body) ?? []).map(
    (message): ValidationError => ({ path: '', message })
  );
  return errors.length === 0
    ? { valid: true, errors: [], warnings, composition }
    : { valid: false, errors, warnings, composition };
};
