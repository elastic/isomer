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

import type { StudioSurface } from './model/describe_runtime';
import type { PreviewZoom } from './surfaces/scaled_preview';
import type { RenderPdf } from './types';

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
  /** `false` leaves out the composition's leading title, as a slide on its own wants. Defaults to `true`. */
  heading?: boolean | undefined;
  /** Enhancement ids passed to the React surface, such as the slides pack's `SLIDE_BUILDS`. */
  enhancements?: readonly string[] | undefined;
  /** Called with the shadow root after each render commits, for a host step such as `showSlideBuild`. Never called on the `html` fallback. */
  onCommit?: ((root: ShadowRoot) => void) | undefined;
};

/** A surface an app can show: one of the runtime's, or `png`, the host's rasterized snapshot. */
export type StudioAppSurface = StudioSurface | 'png';

export interface StudioSurfaceProps {
  composition: Composition;
  surface: StudioAppSurface;
  /** `source` shows what the surface produced, as text. Defaults to `render`. */
  view?: 'render' | 'source' | undefined;
  /** Scales the `react`, `html`, `snapshot` and `png` renders. Defaults to `fit`. */
  zoom?: PreviewZoom | undefined;
  /** `false` leaves out the composition's leading title. Defaults to `true`. */
  heading?: boolean | undefined;
}

/** What the Studio hands an app's page. */
export interface StudioAppProps {
  /** Renders pack output in a shadow root, isolated from the app's and the Studio's styles. `nodes` go through the config's `compose`. */
  Preview: ComponentType<StudioPreviewProps>;
  runtime: StudioRuntime;
  theme: StudioTheme;
  /** The part of the hash after `#/app/<id>/`, which may contain slashes. */
  path: string;
  navigate: (path: string) => void;
  /** Renders a finished composition on one surface, with what it reported, as the Studio's own previews do. */
  Surface: ComponentType<StudioSurfaceProps>;
  /** The surfaces `Surface` can show, in display order, with their labels; `png` only when the host rasterizes. */
  surfaces: readonly { id: StudioAppSurface; label: string }[];
  /** Present when the host can write PDFs, as `dev` does. */
  renderPdf?: RenderPdf | undefined;
}

/** A nav row under an app, listed without loading it. */
export interface StudioAppPage {
  /** The page's `path` under `#/app/<id>/`, one or more segments; the page is active for it and every path below it. */
  path: string;
  title: string;
  /** Pages with the same `section` are listed under it, in order of first appearance. */
  section?: string | undefined;
}

/** A page of the Studio that demonstrates the pack, under `#/app/<id>/`. */
export interface StudioApp {
  /** A URL-safe hash segment, unique within the config: `/^[a-z][a-z0-9-]*$/`. */
  id: string;
  title: string;
  /** One line on what the app shows, on the Home page's tile and its Loaded panel. */
  description?: string | undefined;
  icon?: PrimitiveIcon | undefined;
  /** A module whose default export is the app's page. Node never calls it, so server-only code stays out of it. */
  load: () => Promise<{ default: ComponentType<StudioAppProps> }>;
  pages?: readonly StudioAppPage[] | undefined;
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
  /** Pages listed under the app in the nav. */
  apps?: readonly StudioApp[] | undefined;
  /**
   * A module path, relative to the config, whose default export lists the takumi `FontLoader`s PNGs and PDFs are drawn with.
   * Node imports it and the browser never does, so it may read files. Without it, PNGs use takumi's built-in face and PDFs can't draw text.
   */
  imageFonts?: string | undefined;
  /**
   * Primitive `type`s the Home page features, in this order. Without it, Home picks {@link FEATURED_COUNT}
   * at random on each load.
   */
  featured?: readonly string[] | undefined;
}

/** How many primitives Home features when the config names none. */
export const FEATURED_COUNT = 6;

/** Types a config file's default export. */
export const defineStudioConfig = (config: StudioConfig): StudioConfig =>
  config;
