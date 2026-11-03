/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import {
  type ChartTokens,
  MAX_PALETTE_BANDS,
  type TextTokens,
  type Tone,
  TONES,
  VALUE_PALETTES,
  valuePaletteColors,
} from '../theme';

const toneSchema = z.enum(TONES);

const paletteBandSchema = z
  .object({
    palette: z.enum(VALUE_PALETTES),
    of: z
      .number()
      .int()
      .min(1)
      .max(MAX_PALETTE_BANDS)
      .describe('How many bands the palette is split into.'),
    step: z.number().int().min(0).describe('The band, from 0 and below `of`.'),
  })
  .strict()
  .check((ctx) => {
    if (ctx.value.step >= ctx.value.of) {
      ctx.issues.push({
        code: 'custom',
        message: '`step` must be below `of`',
        path: ['step'],
        input: ctx.value.step,
      });
    }
  })
  .describe(
    "A band of one of Lens's named value palettes: `status`, `temperature`, `complementary`, `negative`, `positive`, `cool`, `warm` or `gray`."
  );

/** Schema of a mark color: a theme tone, a value palette band or `#rrggbb`. */
export const colorSchema = z
  .union([toneSchema, z.string().regex(/^#[0-9a-fA-F]{6}$/), paletteBandSchema])
  .describe(
    'A theme tone (`default`, `primary`, `neutral`, `success`, `warning`, `risk`, `danger`), a `#rrggbb` color, or a value palette band.'
  );

/** A theme tone, a value palette band or a `#rrggbb` color. */
export type ColorRef = z.infer<typeof colorSchema>;

const isTone = (color: ColorRef): color is Tone =>
  typeof color === 'string' && (TONES as readonly string[]).includes(color);

/** The `#rrggbb` a tone's solid, a palette band or a hex color reads. */
const solid = (color: ColorRef, tokens: ChartTokens): string =>
  typeof color === 'object'
    ? valuePaletteColors[color.palette][color.of - 1]![color.step]!
    : isTone(color)
      ? tokens.tones[color].solid
      : color;

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

/** Elastic Charts' sparkline shade: `fill` with HSL lightness moved 0.1 away from the nearer end. */
export const sparkShade = (fill: string): string => {
  const [r, g, b] = [1, 3, 5].map(
    (start) => parseInt(fill.slice(start, start + 2), 16) / 255
  ) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  const h =
    d === 0
      ? 0
      : max === r
        ? ((g - b) / d + 6) % 6
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  const lightness = l >= 0.8 ? l - 0.1 : l + 0.1;
  const c = (1 - Math.abs(2 * lightness - 1)) * s;
  const x = c * (1 - Math.abs((h % 2) - 1));
  const m = lightness - c / 2;
  const [r1, g1, b1] =
    h < 1
      ? [c, x, 0]
      : h < 2
        ? [x, c, 0]
        : h < 3
          ? [0, c, x]
          : h < 4
            ? [0, x, c]
            : h < 5
              ? [x, 0, c]
              : [c, 0, x];
  return `#${[r1, g1, b1]
    .map((channel) =>
      Math.round((channel + m) * 255)
        .toString(16)
        .padStart(2, '0')
    )
    .join('')
    .toUpperCase()}`;
};

/** A fill: a tone's solid color, a palette band, or the hex itself. */
export const resolveFill = (color: ColorRef, tokens: ChartTokens): string =>
  solid(color, tokens);

/** A badge: a tone's soft pair, or the color with readable text. */
export const resolveBadge = (
  color: ColorRef,
  tokens: ChartTokens
): { background: string; text: string } => {
  if (isTone(color)) {
    return {
      background: tokens.tones[color].softBackground,
      text: tokens.tones[color].softText,
    };
  }
  const background = solid(color, tokens);
  return { background, text: textOn(background, tokens).title };
};
