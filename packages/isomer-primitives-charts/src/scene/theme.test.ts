/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

import { CATEGORICAL_PALETTE, CHART_CHROME, mixLch } from './theme';

const require = createRequire(import.meta.url);
const colors = (file: string) =>
  require(
    `@elastic/eui-theme-borealis/lib/cjs/variables/colors/${file}.js`
  ) as Record<string, Record<string, string>>;

describe('chart theme', () => {
  it.each([
    ['light', colors('_colors_light'), ''],
    ['dark', colors('_colors_dark'), 'dark_'],
  ] as const)('%s chrome is EUI Borealis', (scheme, tokens, prefix) => {
    const text = tokens[`${prefix}text_colors`]!;
    const border = tokens[`${prefix}border_colors`]!;
    const background = tokens[`${prefix}background_colors`]!;
    expect(CHART_CHROME[scheme]).toEqual({
      text: text.textParagraph,
      textSubdued: text.textSubdued,
      axis: border.borderBasePlain,
      gridLine: border.borderBaseSubdued,
      background: background.backgroundBasePlain,
      border: border.borderBasePlain,
    });
  });

  it.each([
    ['light', '_colors_vis_light'],
    ['dark', '_colors_vis_dark'],
  ])('the categorical palette is Borealis euiColorVis0–9 in %s', (_, file) => {
    const vis = Object.values(colors(file))[0]!;
    expect(CATEGORICAL_PALETTE).toEqual(
      Array.from({ length: 10 }, (__, index) => vis[`euiColorVis${index}`])
    );
  });
});

describe('mixLch', () => {
  // Expected values are chroma-js 2.6's `mix(color, toward, amount, 'lch').hex()`.
  it.each([
    ['#16C5C0', '#FFFFFF', 0.2, '#65D1CC'],
    ['#16C5C0', '#FFFFFF', 0.4, '#91DDD9'],
    ['#61A2FF', '#111C2C', 0.2, '#4E85D0'],
    ['#EE72A6', '#111C2C', 0.4, '#82538A'],
    ['#CAD3E2', '#FFFFFF', 0.2, '#D5DCE8'],
    ['#808080', '#111C2C', 0.4, '#52555D'],
    ['#F6726A', '#FFFFFF', 0.8, '#FFE3E0'],
    ['#16C5C080', '#FFFFFF', 0.2, '#65D1CC99'],
    ['#16C5C080', '#FFFFFF', 0, '#16C5C080'],
    ['#EE72A6', '#111C2C80', 0.4, '#82538ACC'],
  ])(
    'mixes %s toward %s by %s as chroma-js does',
    (color, toward, amount, mixed) => {
      expect(mixLch(color, toward, amount)).toBe(mixed);
    }
  );

  it('leaves a color as is at 0', () => {
    expect(mixLch('#16C5C0', '#FFFFFF', 0)).toBe('#16C5C0');
  });
});
