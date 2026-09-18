/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type DistillateHtmlEngine,
  type DistillateThemeVar,
  type EnhancementDefinition,
  type HTMLDispatcherRenderOptions,
  type HTMLEnhancementScope,
  type HTMLRenderDispatcher,
  type HTMLRenderOptions,
  type HTMLRenderResult,
  type HTMLStyleAdapter,
  DISTILLATE_STYLE_COLLECTOR,
  createDistillateHtmlStyleAdapter,
  enhancementScript,
  flattenSchemeOption,
  renderHTMLWithDispatcher,
  resolveEnhancements,
} from '../render/html';
export {
  type ReactContentDispatcher,
  type ReactContentOptions,
  renderCompositionContent,
  useReactPrimitiveDispatcher,
} from '../render/react';
