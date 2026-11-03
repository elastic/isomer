/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dark from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_dark.json';
import light from '@elastic/eui-theme-borealis/lib/eui_theme_borealis_light.json';
import { describe, expect, it } from 'vitest';

import { chartTokens } from './theme';

describe('chartTokens', () => {
  it.each([
    ['light', light],
    ['dark', dark],
  ] as const)('take %s tone fills from EUI Borealis', (scheme, borealis) => {
    const fills = Object.fromEntries(
      Object.entries(chartTokens[scheme].tones).map(([tone, { solid }]) => [
        tone,
        solid,
      ])
    );
    expect(fills).toEqual({
      default: borealis.euiColorSeverityUnknown,
      primary: borealis.euiColorPrimary,
      neutral: borealis.euiColorSeverityNeutral,
      success: borealis.euiColorSeveritySuccess,
      warning: borealis.euiColorSeverityWarning,
      risk: borealis.euiColorSeverityRisk,
      danger: borealis.euiColorSeverityDanger,
    });
  });
});
