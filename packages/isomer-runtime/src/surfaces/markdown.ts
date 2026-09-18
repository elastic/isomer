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
  type MarkdownEnvelopeDispatcher,
  renderMarkdownEnvelope,
} from '@elastic/isomer-sdk/markdown';

export interface MarkdownRenderOptions {
  /** Defaults to `'throw'`: a string has nowhere to carry findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Renders a composition or node to Markdown. */
export interface MarkdownSurface {
  /** Always `true`: this surface validates the composition before rendering. */
  readonly validating: true;
  /** Renders a full composition to Markdown. */
  render(composition: Composition, options?: MarkdownRenderOptions): string;
  /** Renders a single primitive node to Markdown. */
  renderNode(node: PrimitiveNode): string;
}

/** Creates the `markdown` {@link RuntimeSurfaces} entry. */
export const createMarkdownSurface = (
  dispatcher: MarkdownEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => ValidationResult
): MarkdownSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    enforceValidationMode(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderMarkdownEnvelope(composition, dispatcher);
  },
  renderNode: (node) => dispatcher.renderMarkdown(node),
});
