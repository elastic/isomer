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
  renderTextEnvelope,
  type TextEnvelopeDispatcher,
  type TextEnvelopeOptions,
} from '@elastic/isomer-sdk/text';

import { checkNode } from './check_node';

/** {@link TextEnvelopeOptions} plus the surface's validation posture. */
export interface TextRenderOptions extends TextEnvelopeOptions {
  /** Defaults to `'throw'`: a string has nowhere to carry findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Options for {@link TextSurface.renderNode}: a lone node has no heading to draw. */
export type TextRenderNodeOptions = Pick<
  TextRenderOptions,
  'onValidationError'
>;

/** Renders a composition or node to plain text. */
export interface TextSurface {
  /** Always `true`: this surface validates the composition and renders the copy it checked, never the caller's value. */
  readonly validating: true;
  /** Renders a full composition to plain text. */
  render(composition: Composition, options?: TextRenderOptions): string;
  /** Renders a single primitive node to plain text. */
  renderNode(node: PrimitiveNode, options?: TextRenderNodeOptions): string;
}

/** Creates the `text` {@link RuntimeSurfaces} entry. */
export const createTextSurface = (
  dispatcher: TextEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => CheckedValidationResult
): TextSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    const checked = compositionToRender(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderTextEnvelope(checked, dispatcher, options);
  },
  renderNode: (node, options = {}) =>
    dispatcher.renderText(
      checkNode(validate, node, options.onValidationError ?? 'throw').node
    ),
});
