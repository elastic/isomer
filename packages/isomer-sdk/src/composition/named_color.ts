/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Portable color names shared by primitive packs and renderers. An exact subset of EUI's `NamedColor`. */
export type NamedColor =
  'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'risk' | 'danger';

/** Every {@link NamedColor}, and the source `namedColorSchema` derives from. */
export const ALL_NAMED_COLORS: readonly NamedColor[] = [
  'neutral',
  'primary',
  'accent',
  'success',
  'warning',
  'risk',
  'danger',
];

/** Light/dark preference. `auto` resolves light wherever media queries are unavailable. */
export type RenderTheme = 'auto' | 'light' | 'dark';

/** A pack's colors by name. Partial: an unmapped name falls back to the renderer's default. */
export type NamedColorPalette = Partial<Record<NamedColor, string>>;
