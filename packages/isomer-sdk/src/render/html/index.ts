/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type DistillateHtmlEngine,
  type DistillateThemeVar,
  DISTILLATE_STYLE_COLLECTOR,
  createDistillateHtmlStyleAdapter,
  flattenSchemeOption,
} from './distillate_style_adapter';
export {
  type EnhancementDefinition,
  enhancementScript,
  resolveEnhancements,
} from './enhancements';
export {
  type HTMLDispatcherRenderOptions,
  type HTMLEnhancementScope,
  type HTMLRenderDispatcher,
  type HTMLRenderOptions,
  type HTMLRenderResult,
  type HTMLStyleAdapter,
  renderHTMLWithDispatcher,
} from './envelope';
