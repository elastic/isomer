/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The two hues a slide may use: `primary` is Isomer or the runtime, `pink` is the host. */
export const slideTones = ['primary', 'pink'] as const;

/** One of {@link slideTones}. */
export type SlideTone = (typeof slideTones)[number];

/** Type steps for a length-sensitive primitive's `size`, largest first. */
export const slideSizes = ['l', 'm', 's'] as const;

/** One of {@link slideSizes}. */
export type SlideSize = (typeof slideSizes)[number];

/** Backgrounds for {@link SlideFrameNode.tone}. `inverse` is for title, section, and closing slides. */
export const slideFrameTones = ['page', 'inverse'] as const;

/** One of {@link slideFrameTones}. */
export type SlideFrameTone = (typeof slideFrameTones)[number];

/** Column widths for {@link SlideSplitNode.ratio}. */
export const slideSplitRatios = ['even', 'wideLeft', 'narrowLeft'] as const;

/** One of {@link slideSplitRatios}. */
export type SlideSplitRatio = (typeof slideSplitRatios)[number];

/** What sits between the columns of a {@link SlideSplitNode}. */
export const slideSplitDividers = ['gap', 'rule', 'arrow'] as const;

/** One of {@link slideSplitDividers}. */
export type SlideSplitDivider = (typeof slideSplitDividers)[number];

/** Vertical gaps for {@link SlideStackNode.spacing}. */
export const slideStackSpacings = ['tight', 'normal', 'loose'] as const;

/** One of {@link slideStackSpacings}. */
export type SlideStackSpacing = (typeof slideStackSpacings)[number];

/** Glyphs for {@link SlideBulletListNode.marker}. */
export const slideBulletMarkers = ['dot', 'check', 'x'] as const;

/** One of {@link slideBulletMarkers}. */
export type SlideBulletMarker = (typeof slideBulletMarkers)[number];

/** Speakers for {@link SlideTranscriptNode} turns. */
export const slideTranscriptRoles = ['user', 'model', 'host'] as const;

/** One of {@link slideTranscriptRoles}. */
export type SlideTranscriptRole = (typeof slideTranscriptRoles)[number];

/** How a {@link SlideTranscriptNode} turn sets its text. */
export const slideTranscriptFormats = ['prose', 'code'] as const;

/** One of {@link slideTranscriptFormats}. */
export type SlideTranscriptFormat = (typeof slideTranscriptFormats)[number];

/** Surrounds for {@link SlideWindowNode.chrome}. */
export const slideWindowChromes = [
  'browser',
  'terminal',
  'slack',
  'chat',
] as const;

/** One of {@link slideWindowChromes}. */
export type SlideWindowChrome = (typeof slideWindowChromes)[number];

/** Surfaces a {@link SlideRenderNode} can embed. */
export const slideRenderSurfaces = [
  'react',
  'html',
  'svg',
  'markdown',
  'text',
  'slack',
] as const;

/** One of {@link slideRenderSurfaces}. */
export type SlideRenderSurface = (typeof slideRenderSurfaces)[number];
