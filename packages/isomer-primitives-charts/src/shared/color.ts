/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { type ChartTokens, type TextTokens, type Tone, TONES } from '../theme';

const toneSchema = z.enum(TONES);

/** Schema of a mark color: a theme tone or `#rrggbb`. */
export const colorSchema = z
  .union([toneSchema, z.string().regex(/^#[0-9a-fA-F]{6}$/)])
  .describe(
    'A theme tone (`default`, `primary`, `neutral`, `success`, `warning`, `risk`, `danger`) or a `#rrggbb` color.'
  );

/** A theme tone or a `#rrggbb` color. */
export type ColorRef = z.infer<typeof colorSchema>;

const isTone = (color: ColorRef): color is Tone =>
  (TONES as readonly string[]).includes(color);

/** The `#rrggbb` a tone's solid or a hex color reads. */
const solid = (color: ColorRef, tokens: ChartTokens): string =>
  isTone(color) ? tokens.tones[color].solid : color;

/** WCAG relative luminance of a `#rrggbb` color. */
const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
};

const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
};

/** The text tokens that read best on `fill`. */
export const textOn = (fill: string, tokens: ChartTokens): TextTokens =>
  contrast(fill, tokens.onLight.title) >= contrast(fill, tokens.onDark.title)
    ? tokens.onLight
    : tokens.onDark;

/** A fill: a tone's solid color, or the hex itself. */
export const resolveFill = (color: ColorRef, tokens: ChartTokens): string =>
  solid(color, tokens);
