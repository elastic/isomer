/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { authoringBodySchema } from '../validate';
export {
  type AuthorChildContext,
  type AuthoredChildBrand,
  type AuthoredChildField,
  type AuthoredNodesBrand,
  type AuthoredNodesField,
  type AuthoredSpec,
  type AuthoredTextBrand,
  type AuthoredTextField,
  type AuthoredToItemBrand,
  fromChildren,
  fromNodeChildren,
  fromTextChildren,
  readAuthoredSpec,
} from './authored_fields';
export {
  type AuthoringDeclarationsOptions,
  buildAuthoringDeclarations,
} from './declarations';
export { type AuthorComponent } from './jsx';
export {
  type AuthorComposition,
  type CompositionAuthorProps,
  type JsxShim,
  type PrimitiveComponentMap,
  buildJsxShim,
  textFromChildren,
} from './jsx_shim';
export {
  type PrintCompositionRoot,
  type PrintJsxEnv,
  printCompositionJsx,
  printNodeJsx,
} from './print_jsx';
export {
  type AuthoringProfileId,
  type AuthoringPromptContext,
  type AuthoringViewSummary,
  AUTHORING_PROFILE_IDS,
  buildAuthoringPrompt,
  formatPrimitiveEntry,
} from './prompt';
