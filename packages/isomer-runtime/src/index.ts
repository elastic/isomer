/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  type CreateIsomerRuntime,
  type FrameMap,
  type HostCapabilities,
  type IsomerRuntime,
  type IsomerRuntimeOptions,
  type PrimitiveDescriptions,
  type PropDescriptor,
  type RuntimeAuthoringContext,
  type RuntimeRendererOverrides,
  type RuntimeSurfaces,
  type SurfaceSupport,
  createIsomerRuntime,
} from './assemble';
export {
  type DefineViewOptions,
  type JsonSchema,
  type RegisteredView,
  type RegisteredViewSummary,
  type ViewBuildArgs,
  type ViewInput,
  type ViewRegistry,
  type ViewResponse,
  defineView,
  RegisteredViewInputError,
} from './registry';

export type {
  HTMLRenderOptions,
  HTMLRenderResult,
  HTMLStyleAdapter,
  HtmlSurface,
} from './surfaces/html';
export type {
  MarkdownRenderNodeOptions,
  MarkdownRenderOptions,
  MarkdownSurface,
} from './surfaces/markdown';
export type {
  ReactRenderArgs,
  ReactRenderNodeOptions,
  ReactRenderOptions,
  ReactSurface,
} from './surfaces/react';
export type {
  SlackRenderNodeOptions,
  SlackRenderOptions,
  SlackRenderResult,
  SlackSurface,
} from './surfaces/slack';
export type {
  SvgHeightWarning,
  SvgPagesResult,
  SvgRenderNodeOptions,
  SvgRenderOptions,
  SvgRenderResult,
  SvgSurface,
} from './surfaces/svg';
export type {
  TextRenderNodeOptions,
  TextRenderOptions,
  TextSurface,
} from './surfaces/text';
export {
  type IsomerErrorCode,
  ISOMER_ERROR_CODES,
  CompositionValidationError,
  IsomerError,
} from '@elastic/isomer-sdk';
