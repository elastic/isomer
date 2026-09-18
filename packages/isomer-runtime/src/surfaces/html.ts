/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  PrimitiveDispatcher,
  PrimitiveNode,
  PrimitiveRenderContext,
  PrimitiveStyleCollector,
  ValidationResult,
} from '@elastic/isomer-sdk';
import {
  type EnhancementDefinition,
  type HTMLRenderOptions,
  type HTMLRenderResult,
  type HTMLStyleAdapter,
  renderHTMLWithDispatcher,
} from '@elastic/isomer-sdk/html';

import type { RuntimePackTypes } from '../pack_types';

export type { HTMLRenderOptions, HTMLRenderResult, HTMLStyleAdapter };

/** Renders a composition or node to an HTML document/fragment string. */
export interface HtmlSurface {
  /** Always `true`: this surface validates the composition before rendering. */
  readonly validating: true;
  /** Renders a full composition to an HTML document/fragment. */
  render(
    composition: Composition,
    options?: HTMLRenderOptions
  ): HTMLRenderResult;
  /** Renders a single primitive node to HTML. */
  renderNode(
    node: PrimitiveNode,
    options?: HTMLRenderOptions
  ): HTMLRenderResult;
}

/**
 * Creates the `html` {@link RuntimeSurfaces} entry.
 *
 * @param defaultAriaLabel Used only when the composition has neither
 * `meta.ariaLabel` nor a `title`.
 */
export const createHtmlSurface = <TRenderContext = PrimitiveRenderContext>(
  dispatcher: PrimitiveDispatcher<
    PrimitiveNode,
    RuntimePackTypes<TRenderContext>
  >,
  validate: (composition: Composition) => ValidationResult,
  styleAdapter:
    | HTMLStyleAdapter<PrimitiveNode, PrimitiveStyleCollector, TRenderContext>
    | undefined,
  enhancementDefinitions: readonly EnhancementDefinition[] = [],
  defaultAriaLabel = 'View'
): HtmlSurface => {
  const renderHtml = (
    composition: Composition,
    options: HTMLRenderOptions
  ): HTMLRenderResult => {
    return renderHTMLWithDispatcher(composition, {
      dispatcher,
      validate,
      options,
      defaultAriaLabel,
      ...(styleAdapter ? { styleAdapter } : {}),
      enhancementDefinitions,
    });
  };

  return {
    validating: true,
    render: (composition, options = {}) => renderHtml(composition, options),
    renderNode: (node, options = {}) =>
      renderHtml({ type: 'view', body: [node] }, options),
  };
};
