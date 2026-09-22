/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { contextualVar, createDistillery } from '@elastic/distillate';

import { SLIDE_THEME } from './theme';

/** Shared contextual CSS var for the active tone foreground color. */
export const toneVar = contextualVar('vars/tone', '--slide-vars-tone');
/** Shared contextual CSS var for the active tone background color. */
export const toneBgVar = contextualVar('vars/toneBg', '--slide-vars-toneBg');

/** Class name every deck root carries, and the theme's scope selector. */
export const isomerDeckRoot = 'isomerDeckRoot';

// Guarded so the pack loads as unbundled browser ESM, where `process` is absent.
const dev =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/** Single distillate instance for all slide CSS modules. */
export const slideDistillery = createDistillery({
  dev,
  prefix: 'slide',
  themeScope: `.${isomerDeckRoot}`,
  sharedVars: ['vars/tone', 'vars/toneBg'],
  theme: SLIDE_THEME,
});
