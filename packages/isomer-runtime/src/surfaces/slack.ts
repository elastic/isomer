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
  renderSlackEnvelope,
  type SlackEnvelopeDispatcher,
  type SlackEnvelopeOptions,
  type SlackEnvelopeResult,
} from '@elastic/isomer-sdk/slack';

import { checkNode } from './check_node';

/** {@link SlackEnvelopeOptions} plus the surface's validation posture. */
export interface SlackRenderOptions extends SlackEnvelopeOptions {
  /** Defaults to `'throw'`: a payload about to be posted carries no findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Options for {@link SlackSurface.renderNode}: {@link SlackRenderOptions} without a heading, which a lone node lacks. */
export type SlackRenderNodeOptions = Omit<SlackRenderOptions, 'heading'>;

export type SlackRenderResult = SlackEnvelopeResult;

/** Renders a composition or node to Slack Block Kit blocks. */
export interface SlackSurface {
  /** Always `true`: this surface validates the composition and renders the copy it checked, never the caller's value. */
  readonly validating: true;
  /** Renders a full composition to a Slack message (blocks, fallback text, assets). */
  render(
    composition: Composition,
    options?: SlackRenderOptions
  ): SlackRenderResult;
  /**
   * Renders a single primitive node as a Slack message of its own: the same
   * `{ text, blocks, assets }` as `render`, so a picture node reaches the host
   * as an upload request when `collectAssets` is set.
   */
  renderNode(
    node: PrimitiveNode,
    options?: SlackRenderNodeOptions
  ): SlackRenderResult;
}

/** Creates the `slack` {@link RuntimeSurfaces} entry. */
export const createSlackSurface = (
  dispatcher: SlackEnvelopeDispatcher<PrimitiveNode>,
  validate: (composition: Composition) => CheckedValidationResult
): SlackSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    const checked = compositionToRender(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderSlackEnvelope(checked, dispatcher, options);
  },
  renderNode: (node, options = {}) =>
    renderSlackEnvelope(
      checkNode(validate, node, options.onValidationError ?? 'throw')
        .composition,
      dispatcher,
      options
    ),
});
