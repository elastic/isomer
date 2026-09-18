/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type AuthorChildContext,
  type AuthoredChildBrand,
  type AuthoredTextBrand,
  fromChildren,
  fromTextChildren,
} from './authored_fields';
export {
  type BuilderInput,
  type BuilderMap,
  type NodeBuilder,
  buildObjectBuilders,
  defineNodeBuilder,
} from './builders';
export { type AuthorComponent, authorType, defineAuthorComponent } from './jsx';
export {
  type AuthorComposition,
  type CompositionAuthorProps,
  type JsxShim,
  type PrimitiveComponentMap,
  buildJsxShim,
  flattenChildren,
  getAuthorType,
  itemsFromChildren,
  requireAuthorElement,
  textFromChildren,
  withoutChildren,
} from './jsx_shim';
export {
  type AgentAuthoringContextDefaults,
  type AgentAuthoringContextOptions,
  type AuthoringProfileId,
  type AuthoringPromptContext,
  type AuthoringViewSummary,
  AUTHORING_PROFILE_IDS,
  buildAuthoringPrompt,
  createAgentAuthoringContextFactory,
  createAuthoringPromptBuilder,
} from './prompt';
