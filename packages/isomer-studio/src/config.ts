/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IsomerRuntime } from '@elastic/isomer-runtime';
import type {
  Composition,
  PrimitiveNode,
  StyledRenderContext,
} from '@elastic/isomer-sdk';

/** A runtime whose React renderers resolve style handles through `resolveClassName`. */
export type StudioRuntime = IsomerRuntime<unknown, StyledRenderContext>;

export type StudioTheme = 'light' | 'dark';

/** Wraps example nodes in a composition the runtime's frame accepts. */
export type StudioCompose = (
  nodes: readonly PrimitiveNode[],
  options: { theme: StudioTheme }
) => Composition;

/** What a pack hands `isomer-studio`, as the default export of its config file. */
export interface StudioConfig {
  /**
   * Replaces the header, the page title, and the `check` report name, which are `Isomer Studio`.
   * A pack's name belongs in the nav.
   */
  title?: string | undefined;
  runtime: StudioRuntime;
  /** Host styling for the React surface inside a shadow root; without it the React preview falls back to the `html` surface. */
  createReactContext?: ((root: ShadowRoot) => StyledRenderContext) | undefined;
  /** Defaults to `{ type: 'view', body: nodes, theme }`. Return a node that is already a valid root as is. */
  compose?: StudioCompose | undefined;
}

/** Types a config file's default export. */
export const defineStudioConfig = (config: StudioConfig): StudioConfig =>
  config;
