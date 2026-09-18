/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  PrimitiveNode,
  ValidationErrorMode,
  ValidationResult,
} from '@elastic/isomer-sdk';
import { enforceValidationMode } from '@elastic/isomer-sdk';
import {
  renderTextEnvelope,
  type TextEnvelopeDispatcher,
} from '@elastic/isomer-sdk/text';

export interface TextRenderOptions {
  /** Defaults to `'throw'`: a string has nowhere to carry findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Renders a composition or node to plain text. */
export interface TextSurface {
  /** Always `true`: this surface validates the composition before rendering. */
  readonly validating: true;
  /** Renders a full composition to plain text. */
  render(composition: Composition, options?: TextRenderOptions): string;
  /** Renders a single primitive node to plain text. */
  renderNode(node: PrimitiveNode): string;
}

/** Creates the `text` {@link RuntimeSurfaces} entry. */
export const createTextSurface = (
  dispatcher: TextEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => ValidationResult
): TextSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    enforceValidationMode(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderTextEnvelope(composition, dispatcher);
  },
  renderNode: (node) => dispatcher.renderText(node),
});
