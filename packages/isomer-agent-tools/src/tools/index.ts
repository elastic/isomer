/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { type CompositionCheck, checkComposition } from './check';
export { createIsomerTools } from './create_tools';
export {
  DEFAULT_ISOMER_GUIDE,
  DEFAULT_ISOMER_INSTRUCTIONS,
  buildIsomerAuthoringGuide,
  buildPrimitiveDescriptions,
} from './guide';
export {
  ISOMER_AUTHORING_GUIDE_URI,
  ISOMER_COMPOSE_PROMPT,
  ISOMER_COMPOSITION_SCHEMA_URI,
  ISOMER_TOOL_NAMES,
} from './names';
export { createIsomerPrompts } from './prompts';
export { createIsomerResources } from './resources';
export { imageResult, jsonResult, textResult } from './result';
export type {
  IsomerPrompt,
  IsomerResource,
  IsomerTool,
  IsomerToolContent,
  IsomerToolResult,
  IsomerToolsBaseOptions,
  IsomerToolsFrame,
  IsomerToolsImage,
  IsomerToolsOptions,
  IsomerToolsRuntime,
  IsomerToolSurface,
  IsomerToolsWarning,
} from './types';
