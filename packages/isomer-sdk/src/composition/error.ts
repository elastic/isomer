/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Stable codes for {@link IsomerError}, {@link CompositionValidationError},
 * and the runtime's `RegisteredViewInputError`. Hosts branch on `code`, not
 * on `message`. Codes name the condition, not the throwing module: duplicate
 * type at `definePrimitivePack`, `composePacks`, and `createIsomerRuntime` is the same
 * `DUPLICATE_PRIMITIVE_TYPE`; the message names the layer.
 */
export const ISOMER_ERROR_CODES = {
  AMBIGUOUS_FRAME: 'AMBIGUOUS_FRAME',
  AMBIGUOUS_STYLE_ADAPTER: 'AMBIGUOUS_STYLE_ADAPTER',
  AUTHOR_TYPE_MISMATCH: 'AUTHOR_TYPE_MISMATCH',
  COMPOSITION_INVALID: 'COMPOSITION_INVALID',
  DUPLICATE_AUTHORED_CHILD: 'DUPLICATE_AUTHORED_CHILD',
  DUPLICATE_ENHANCEMENT: 'DUPLICATE_ENHANCEMENT',
  DUPLICATE_PRIMITIVE_TYPE: 'DUPLICATE_PRIMITIVE_TYPE',
  DUPLICATE_VIEW: 'DUPLICATE_VIEW',
  EMPTY_PACK: 'EMPTY_PACK',
  EMPTY_PACKS: 'EMPTY_PACKS',
  EMPTY_VOCABULARY: 'EMPTY_VOCABULARY',
  EXPECTED_AUTHOR_COMPONENT: 'EXPECTED_AUTHOR_COMPONENT',
  EXPECTED_JSX_ELEMENT: 'EXPECTED_JSX_ELEMENT',
  EXPECTED_TEXT_CHILDREN: 'EXPECTED_TEXT_CHILDREN',
  INCOMPATIBLE_STYLE_COLLECTOR: 'INCOMPATIBLE_STYLE_COLLECTOR',
  INVALID_BODY_NODE: 'INVALID_BODY_NODE',
  INVALID_FRAME_BODY: 'INVALID_FRAME_BODY',
  MISSING_AUTHORED_TEXT: 'MISSING_AUTHORED_TEXT',
  MISSING_STYLE_ADAPTER: 'MISSING_STYLE_ADAPTER',
  UNKNOWN_FRAME: 'UNKNOWN_FRAME',
  UNKNOWN_PRIMITIVE_TYPE: 'UNKNOWN_PRIMITIVE_TYPE',
  UNKNOWN_SURFACE: 'UNKNOWN_SURFACE',
  UNKNOWN_VIEW: 'UNKNOWN_VIEW',
  UNSUPPORTED_CHILD_PATH: 'UNSUPPORTED_CHILD_PATH',
  VIEW_INPUT_INVALID: 'VIEW_INPUT_INVALID',
  VOCABULARY_UNRESOLVED: 'VOCABULARY_UNRESOLVED',
} as const;

/** One of {@link ISOMER_ERROR_CODES}. */
export type IsomerErrorCode =
  (typeof ISOMER_ERROR_CODES)[keyof typeof ISOMER_ERROR_CODES];

/**
 * Thrown for construction and authoring failures that are not a
 * `CompositionValidationError`.
 *
 * Identify it by `name` and `code`, never `instanceof`: the SDK ships both
 * ESM and CJS builds, so a host can hold two copies of this class and an
 * identity check would miss one.
 */
export class IsomerError extends Error {
  readonly code: IsomerErrorCode;

  constructor(code: IsomerErrorCode, message: string) {
    super(message);
    this.name = 'IsomerError';
    this.code = code;
  }
}
