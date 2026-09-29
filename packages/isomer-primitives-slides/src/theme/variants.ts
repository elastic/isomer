/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `primary` is yours or in focus; `accent` is the host or another party. */
export const slideTones = ['primary', 'accent'] as const;

export type SlideTone = (typeof slideTones)[number];

/** Largest first. */
export const slideSizes = ['l', 'm', 's'] as const;

export type SlideSize = (typeof slideSizes)[number];

/** `inverse` is for title, section, and closing slides. */
export const slideFrameTones = ['page', 'inverse'] as const;

export type SlideFrameTone = (typeof slideFrameTones)[number];

export const slideSplitRatios = [
  'even',
  'wideLeft',
  'narrowLeft',
  'aside',
] as const;

export type SlideSplitRatio = (typeof slideSplitRatios)[number];

export const slideSplitDividers = ['gap', 'rule', 'hairline', 'arrow'] as const;

export type SlideSplitDivider = (typeof slideSplitDividers)[number];

export const slideStackSpacings = ['tight', 'normal', 'loose'] as const;

export type SlideStackSpacing = (typeof slideStackSpacings)[number];

export const slideBulletMarkers = ['dot', 'check', 'x'] as const;

export type SlideBulletMarker = (typeof slideBulletMarkers)[number];

// Variant keys must start with a letter.
export const countKey = (n: number): string => `n${n}`;

export const countOf = (key: string): number => Number(key.slice(1));

/** {@link countKey}s from `from` to `to`, inclusive. */
export const countKeys = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => countKey(from + index));
