/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';

import { slideDistillery } from './distillery';
import { slideStylesheet } from './modules';
import { slidePaletteForMode } from './palette';
import { SLIDE_THEME } from './theme';

describe('pack styleAdapter default', () => {
  it('constructs a runtime without a host styleAdapter', () => {
    const runtime = createIsomerRuntime({
      packs: [slidesPack],
      frames: { slide: slideDeckFrame },
    });
    expect(runtime.surfaces.html).toBeDefined();
  });
});

describe('palette values agree with distillate tokens', () => {
  it('stylesheet emits light-dark() pairs from the theme color group', () => {
    const css = slideStylesheet();
    for (const [key, pair] of Object.entries<{ light: string; dark: string }>(
      SLIDE_THEME.color
    )) {
      const decl = `--slide-color-${key}:light-dark(${pair.light},${pair.dark})`;
      if (css.includes(`--slide-color-${key}:`)) {
        expect(css, key).toContain(decl);
      }
    }
  });

  // Sizes and fonts are ScaleToken leaves: they inline their literal instead of
  // becoming custom properties, which is what lets the SVG surface read them.
  it('emits no custom property for non-color theme groups', () => {
    const css = slideStylesheet();
    expect(css).not.toContain('--slide-size-');
    expect(css).not.toContain('--slide-font-');
    expect(css).not.toContain('--slide-radius-');
  });

  it('SVG palettes pick Distillate resolveValues for the matching scheme', () => {
    expect(slidePaletteForMode('light')).toMatchObject(
      slideDistillery.resolveValues('light').color
    );
    expect(slidePaletteForMode('dark')).toMatchObject(
      slideDistillery.resolveValues('dark').color
    );
  });
});
