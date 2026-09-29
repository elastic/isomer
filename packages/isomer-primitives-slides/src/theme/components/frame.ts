/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { font, space } from '../base';
import { px, scalePx } from '../scale';

import { glyph } from './shared';

export const frame = {
  // Canvas, not spacing.
  width: px(1920),
  height: px(1080),
  paddingTop: space.px112,
  paddingX: space.px128,
  paddingBottom: space.px120,
  standalonePadding: space.px96,
  bodyGap: space.px48,
  footerBottom: space.px48,
  footerGap: space.px14,
  brandFontWeight: font.weight.semibold,
  separator: glyph.separator,
  logoSize: px(28),
} as const;

export const frameContentWidth =
  scalePx(frame.width) - 2 * scalePx(frame.paddingX);

/** Width of column `index` in a row of `shares` fr tracks separated by `gap`. */
export const columnWidth = (
  shares: readonly number[],
  gap: ScaleToken,
  index = 0
): number => {
  const total = shares.reduce((sum, share) => sum + share, 0);
  const free = frameContentWidth - scalePx(gap) * (shares.length - 1);
  return (free * (shares[index] ?? 0)) / total;
};
