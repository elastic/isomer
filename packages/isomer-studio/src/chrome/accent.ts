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
  fill: string;
  text: string;
  light: string;
  /** EUI color name for components that take one, such as `EuiButton`. */
  color: 'accentSecondary' | 'primary';
}

const SHELL: Readonly<Record<StudioMode, string>> = {
  dev: '#062B2A',
  docs: '#0B2347',
};

/** Dev mode is tinted teal, docs mode blue, so the two never read as one another. */
export const useAccent = (mode: StudioMode): Accent => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return mode === 'dev'
    ? {
        shell: SHELL.dev,
        fill: colors.backgroundFilledAccentSecondary,
        text: colors.textAccentSecondary,
        light: colors.backgroundLightAccentSecondary,
        color: 'accentSecondary',
      }
    : {
        shell: SHELL.docs,
        fill: colors.backgroundFilledPrimary,
        text: colors.textPrimary,
        light: colors.backgroundLightPrimary,
        color: 'primary',
      };
};
