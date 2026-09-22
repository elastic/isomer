/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from './distillery';
import type { SlideColorName } from './theme';

/**
 * What a {@link Frame} drawing slides must supply.
 *
 * Naming it here rather than importing a shared type is the point: the
 * dispatcher carries each pack's theme opaquely, so a pack declares its own
 * requirement and any host theme that satisfies it works. Keep this minimal —
 * every field added is a constraint on every host that renders slides.
 *
 * Primitives read none of it: they reach the `svg` surface through their
 * `react` renderers and this pack's stylesheet.
 */
export interface SlideFrameTheme {
  /** Body text color, for a frame drawing its own surround. */
  text: string;
}

/** Slide-deck palette, resolved to literals for one color scheme. */
export type SlidePalette = { [K in SlideColorName]: string };

const { resolveValues } = slideDistillery;

const lightSlidePalette: SlidePalette = resolveValues('light').color;

const darkSlidePalette: SlidePalette = resolveValues('dark').color;

/** The palette for one color scheme, as literal values. */
export const slidePaletteForMode = (mode: 'light' | 'dark'): SlidePalette =>
  mode === 'dark' ? darkSlidePalette : lightSlidePalette;
