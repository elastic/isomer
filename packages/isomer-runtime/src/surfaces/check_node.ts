/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CheckedComposition,
  type CheckedValidationResult,
  type Composition,
  compositionToRender,
  CompositionValidationError,
  type PrimitiveNode,
  type ValidationErrorMode,
} from '@elastic/isomer-sdk';

/** Validates `node` as the sole node of a view, for a validating surface's `renderNode`. */
export const checkNode = (
  validate: (composition: Composition) => CheckedValidationResult,
  node: PrimitiveNode,
  mode: ValidationErrorMode
): { composition: CheckedComposition; node: PrimitiveNode } => {
  const composition = compositionToRender(
    validate({ type: 'view', body: [node] }),
    mode
  );
  const [checked] = composition.body;
  if (checked === undefined) {
    throw new CompositionValidationError([
      { path: 'body[0]', message: 'expected a node' },
    ]);
  }
  return { composition, node: checked };
};
