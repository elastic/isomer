/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComponentType } from 'react';
import type { IsomerRuntime } from '@elastic/isomer-runtime';
import type {
  Composition,
  PrimitiveIcon,
  PrimitiveNode,
  StyledRenderContext,
} from '@elastic/isomer-sdk';

import type { PreviewZoom } from './surfaces/scaled_preview';

/** A runtime whose React renderers resolve style handles through `resolveClassName`. */
export type StudioRuntime = IsomerRuntime<unknown, StyledRenderContext>;

export type StudioTheme = 'light' | 'dark';

/** Wraps example nodes in a composition the runtime's frame accepts. */
export type StudioCompose = (
  nodes: readonly PrimitiveNode[],
  options: { theme: StudioTheme }
) => Composition;

export type StudioPreviewProps = (
  | { nodes: readonly PrimitiveNode[]; composition?: never }
  | { composition: Composition; nodes?: never }
) & {
  /** Defaults to `fit`. */
  zoom?: PreviewZoom | undefined;
  /** With `fit`, also scales down to this height. */
  maxHeight?: number | undefined;
};

/** What the Studio hands an app's page. */
export interface StudioAppProps {
  /** Renders pack output in a shadow root, isolated from the app's and the Studio's styles. `nodes` go through the config's `compose`. */
  Preview: ComponentType<StudioPreviewProps>;
  runtime: StudioRuntime;
  theme: StudioTheme;
  /** The part of the hash after `#/app/<id>/`, which may contain slashes. */
  path: string;
  navigate: (path: string) => void;
}

/** A page of the Studio that demonstrates the pack, under `#/app/<id>/`. */
export interface StudioApp {
  /** A URL-safe hash segment, unique within the config: `/^[a-z][a-z0-9-]*$/`. */
  id: string;
  title: string;
  icon?: PrimitiveIcon | undefined;
  /** A module whose default export is the app's page. Node never calls it, so server-only code stays out of it. */
  load: () => Promise<{ default: ComponentType<StudioAppProps> }>;
}

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
  /** Pages listed under Apps in the nav. */
  apps?: readonly StudioApp[] | undefined;
}

/** Types a config file's default export. */
export const defineStudioConfig = (config: StudioConfig): StudioConfig =>
  config;
