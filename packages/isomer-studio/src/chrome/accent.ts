/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

import type { StudioMode } from './route';

export interface Accent {
  fill: string;
  text: string;
  light: string;
}

/** Dev mode is tinted green, docs mode blue, so the two never read as one another. */
export const useAccent = (mode: StudioMode): Accent => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return mode === 'dev'
    ? {
        fill: colors.backgroundFilledSuccess,
        text: colors.textSuccess,
        light: colors.backgroundLightSuccess,
      }
    : {
        fill: colors.backgroundFilledPrimary,
        text: colors.textPrimary,
        light: colors.backgroundLightPrimary,
      };
};
