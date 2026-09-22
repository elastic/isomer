/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Accent tokens a slide primitive can apply. */
export const slideTones = [
  'primary',
  'pink',
  'teal',
  'success',
  'warning',
  'danger',
  'subtle',
] as const;

/** One of {@link slideTones}. */
export type SlideTone = (typeof slideTones)[number];

/** Layout variants for {@link SlideFrameNode.layout}. */
export const slideFrameLayouts = ['title', 'content'] as const;

/** Headline scale for {@link SlideTitleNode.size}. */
export const slideTitleSizes = [
  'jumbo',
  'hero',
  'standard',
  'compact',
] as const;

/** Column-width variants for {@link SlideSplitNode.ratio}. */
export const slideSplitRatios = ['even', 'wideLeft', 'wideRight'] as const;

/** Vertical gaps for {@link SlideStackNode.spacing}. */
export const slideStackSpacings = ['tight', 'normal', 'loose'] as const;

/** Glyphs for {@link SlideBulletListNode.marker}. */
export const slideBulletMarkers = ['dot', 'check', 'x'] as const;

/** Visual treatments for {@link SlideCardGroupNode.style}. */
export const slideCardGroupStyles = ['standard', 'feature'] as const;

/** Column counts for {@link SlideCardGroupNode.columns}. */
export const slideCardColumnCounts = [1, 2, 3, 4, 5, 6] as const;

/** One of {@link slideCardColumnCounts}. */
export type SlideCardColumnCount = (typeof slideCardColumnCounts)[number];

/** {@link slideCardColumnCounts} as the CSS-identifier keys `variants()` requires. */
export const slideCardColumns = [
  'cols1',
  'cols2',
  'cols3',
  'cols4',
  'cols5',
  'cols6',
] as const satisfies ReadonlyArray<`cols${SlideCardColumnCount}`>;

/** The {@link slideCardColumns} key for a column count. */
export const slideCardColumnsKey = (
  count: SlideCardColumnCount
): SlideCardColumns => `cols${count}`;

/** One of {@link slideFrameLayouts}. */
export type SlideFrameLayout = (typeof slideFrameLayouts)[number];

/** One of {@link slideTitleSizes}. */
export type SlideTitleSize = (typeof slideTitleSizes)[number];

/** One of {@link slideSplitRatios}. */
export type SlideSplitRatio = (typeof slideSplitRatios)[number];

/** One of {@link slideStackSpacings}. */
export type SlideStackSpacing = (typeof slideStackSpacings)[number];

/** One of {@link slideBulletMarkers}. */
export type SlideBulletMarker = (typeof slideBulletMarkers)[number];

/** One of {@link slideCardGroupStyles}. */
export type SlideCardGroupStyle = (typeof slideCardGroupStyles)[number];

/** One of {@link slideCardColumns}. */
export type SlideCardColumns = (typeof slideCardColumns)[number];
