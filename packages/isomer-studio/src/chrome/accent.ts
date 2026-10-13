/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';

import type { StudioMode } from './route';

export interface Accent {
  /** The header and nav background. */
  shell: string;
  /** The mode's hue at full strength, for marks drawn on the shell. */
  bright: string;
  fill: string;
  text: string;
  light: string;
}

export const SHELL: Readonly<Record<StudioMode, string>> = {
  dev: '#0B3A2C',
  docs: '#0B2347',
};

/** Dev mode is tinted green, docs mode blue, so the two never read as one another. */
export const useAccent = (mode: StudioMode): Accent => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return mode === 'dev'
    ? {
        shell: SHELL.dev,
        bright: '#00BFB3',
        fill: colors.backgroundFilledSuccess,
        text: colors.textSuccess,
        light: colors.backgroundLightSuccess,
      }
    : {
        shell: SHELL.docs,
        bright: '#1BA9F5',
        fill: colors.backgroundFilledPrimary,
        text: colors.textPrimary,
        light: colors.backgroundLightPrimary,
      };
};
