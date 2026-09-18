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
  renderSlackEnvelope,
  type SlackEnvelopeDispatcher,
  type SlackEnvelopeOptions,
  type SlackEnvelopeResult,
} from '@elastic/isomer-sdk/slack';

/** {@link SlackEnvelopeOptions} plus the surface's validation posture. */
export interface SlackRenderOptions extends SlackEnvelopeOptions {
  /** Defaults to `'throw'`: a payload about to be posted carries no findings. `'collect'` renders anyway. */
  onValidationError?: ValidationErrorMode;
}

/** Options for {@link SlackSurface.renderNode}: {@link SlackRenderOptions} without validation, which a lone node skips. */
export type SlackRenderNodeOptions = Omit<
  SlackRenderOptions,
  'onValidationError'
>;

export type SlackRenderResult = SlackEnvelopeResult;

/** Renders a composition or node to Slack Block Kit blocks. */
export interface SlackSurface {
  /** Always `true`: this surface validates the composition before rendering. */
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
  validate: (composition: Composition) => ValidationResult
): SlackSurface => ({
  validating: true,
  render: (composition, options = {}) => {
    enforceValidationMode(
      validate(composition),
      options.onValidationError ?? 'throw'
    );
    return renderSlackEnvelope(composition, dispatcher, options);
  },
  renderNode: (node, options = {}) =>
    renderSlackEnvelope({ type: 'view', body: [node] }, dispatcher, options),
});
