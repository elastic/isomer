/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiThemeBorealis } from '@elastic/eui-theme-borealis';
import { describe, expect, it } from 'vitest';

import { DEV_DARK_COLORS as dark, tintNeutral } from './dev_tint';
import { hexToOklch, oklchToHex } from './oklch';

describe('DEV_TINT', () => {
  it('moves the base backgrounds toward green', () => {
    const [r = 0, g = 0, b = 0] = [1, 3, 5].map((start) =>
      parseInt((dark.backgroundBasePlain ?? '').slice(start, start + 2), 16)
    );
    expect(g).toBeGreaterThan(b);
    expect(g).toBeGreaterThan(r);
  });

  it('leaves role colors as Borealis defines them', () => {
    expect(dark).not.toHaveProperty('primary');
    expect(dark).not.toHaveProperty('backgroundBaseDanger');
    expect(dark).not.toHaveProperty('textSuccess');
  });

  it('leaves text colors as Borealis defines them', () => {
    expect(dark).not.toHaveProperty('textParagraph');
    expect(dark).not.toHaveProperty('textHeading');
    expect(dark).not.toHaveProperty('title');
    expect(dark).not.toHaveProperty('disabledText');
    expect(dark).not.toHaveProperty('darkestShade');
    expect(dark).not.toHaveProperty('emptyShade');
    expect(dark).toHaveProperty('backgroundLightText');
    expect(dark).toHaveProperty('borderStrongText');
  });

  it('skips colors that are not opaque hex', () => {
    expect(
      EuiThemeBorealis.root.colors.DARK.backgroundBaseInteractiveHover
    ).toMatch(/^rgba/);
    expect(dark).not.toHaveProperty('backgroundBaseInteractiveHover');
  });
});

describe('tintNeutral', () => {
  it('keeps perceived lightness and takes the new hue', () => {
    const before = hexToOklch('#111C2C');
    const after = hexToOklch(tintNeutral('#111C2C', 165));
    expect(after.l).toBeCloseTo(before.l, 2);
    expect(after.h).toBeCloseTo(165, -1);
    expect(after.c).toBeLessThan(before.c);
  });

  it('round-trips through OKLCH', () => {
    expect(oklchToHex(hexToOklch('#485975'))).toBe('#485975');
  });

  it('keeps grays gray', () => {
    expect(tintNeutral('#FFFFFF', 160)).toBe('#FFFFFF');
    expect(tintNeutral('#000000', 160)).toBe('#000000');
  });
});
