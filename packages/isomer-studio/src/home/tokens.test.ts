/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { ISOMER_MARK } from '../chrome/isomer_mark';

import { HOME } from './tokens';

type Rgb = readonly [number, number, number];

const rgb = (hex: string): Rgb => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const luminance = (color: Rgb) => {
  const [r, g, b] = color.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return r! * 0.2126 + g! * 0.7152 + b! * 0.0722;
};

describe('Home action colors', () => {
  it('preserves the exact logo blue and teal', () => {
    expect(HOME.docs).toBe(ISOMER_MARK.blue);
    expect(HOME.dev).toBe(ISOMER_MARK.teal);
  });

  for (const action of ['docs', 'dev'] as const) {
    for (const surface of ['actionSurface', 'actionSurfaceHover'] as const) {
      it(`keeps ${action} text at AA contrast over ${surface}`, () => {
        const contrast =
          (luminance(rgb(HOME[action])) + 0.05) /
          (luminance(rgb(HOME[surface])) + 0.05);
        expect(contrast).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});
