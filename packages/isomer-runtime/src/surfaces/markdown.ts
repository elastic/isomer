/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CheckedValidationResult,
  Composition,
  PrimitiveNode,
  ValidationErrorMode,
} from '@elastic/isomer-sdk';
import { compositionToRender } from '@elastic/isomer-sdk';
import {
  type MarkdownEnvelopeDispatcher,
  type MarkdownEnvelopeOptions,
  renderMarkdownEnvelope,
} from '@elastic/isomer-sdk/markdown';

import { checkNode } from './check_node';

/** {@link MarkdownEnvelopeOptions} plus the surface's validation posture. */
export interface MarkdownRenderOptions extends MarkdownEnvelopeOptions {
  /** Defaults to `'throw'`: a string has nowhere to carry findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Options for {@link MarkdownSurface.renderNode}: a lone node has no heading to draw. */
export type MarkdownRenderNodeOptions = Pick<
  MarkdownRenderOptions,
  'onValidationError'
>;

/** Renders a composition or node to Markdown. */
export interface MarkdownSurface {
  /** Always `true`: this surface validates the composition and renders the copy it checked, never the caller's value. */
  readonly validating: true;
  /** Renders a full composition to Markdown. */
  render(composition: Composition, options?: MarkdownRenderOptions): string;
  /** Renders a single primitive node to Markdown. */
  renderNode(node: PrimitiveNode, options?: MarkdownRenderNodeOptions): string;
}

/** Creates the `markdown` {@link RuntimeSurfaces} entry. */
export const createMarkdownSurface = (
  dispatcher: MarkdownEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => CheckedValidationResult
): MarkdownSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    const checked = compositionToRender(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderMarkdownEnvelope(checked, dispatcher, options);
  },
  renderNode: (node, options = {}) =>
    dispatcher.renderMarkdown(
      checkNode(validate, node, options.onValidationError ?? 'throw').node
    ),
});
