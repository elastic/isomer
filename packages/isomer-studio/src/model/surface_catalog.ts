/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioAppSurface } from '../config';

import type { StudioSurface } from './describe_runtime';

interface SurfaceEntry {
  label: string;
  note: string;
  /** Drawn at a fixed layout width, which a card shows as a scaled 16:9 frame. */
  isVisual: boolean;
  /** One of the browser renders, which a board shows as one card. */
  isBrowser: boolean;
}

/** In display order, exhaustive over the runtime's surfaces so a new one fails the type check here. */
const RUNTIME_SURFACES: Readonly<Record<StudioSurface, SurfaceEntry>> = {
  react: {
    label: 'React',
    note: 'Live React, styled by the host.',
    isVisual: true,
    isBrowser: true,
  },
  html: {
    label: 'HTML',
    note: 'HTML and its stylesheet in shadow DOM.',
    isVisual: true,
    isBrowser: true,
  },
  slack: {
    label: 'Slack',
    note: 'Block Kit, drawn as Slack would.',
    isVisual: false,
    isBrowser: false,
  },
  markdown: {
    label: 'Markdown',
    note: 'Markdown for chat and docs.',
    isVisual: false,
    isBrowser: false,
  },
  text: {
    label: 'Text',
    note: 'Plain text with no markup.',
    isVisual: false,
    isBrowser: false,
  },
  snapshot: {
    label: 'Snapshot',
    note: 'The React render with the pack stylesheet, laid out for an image.',
    isVisual: true,
    isBrowser: true,
  },
};

/** The runtime's surfaces, then `png`, the host's rasterized snapshot. */
export const SURFACE_CATALOG: Readonly<Record<StudioAppSurface, SurfaceEntry>> =
  {
    ...RUNTIME_SURFACES,
    png: {
      label: 'PNG',
      note: 'The snapshot, rasterized by the host.',
      isVisual: true,
      isBrowser: false,
    },
  };

export const isStudioSurface = (name: string): name is StudioSurface =>
  Object.hasOwn(RUNTIME_SURFACES, name);

/** Every runtime surface, in display order. */
export const STUDIO_SURFACES: readonly StudioSurface[] =
  Object.keys(RUNTIME_SURFACES).filter(isStudioSurface);

export const isVisualSurface = (surface: StudioAppSurface): boolean =>
  SURFACE_CATALOG[surface].isVisual;

export type BrowserSurface = 'react' | 'html' | 'snapshot';

export const isBrowserSurface = (
  surface: StudioAppSurface
): surface is BrowserSurface => SURFACE_CATALOG[surface].isBrowser;

/** The picker consolidates HTML, React, and Snapshot into one Web output. */
export const outputLabel = (surface: StudioAppSurface): string =>
  surface === 'html' ? 'Web' : SURFACE_CATALOG[surface].label;
