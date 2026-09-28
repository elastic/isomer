/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { font, space } from '../base';
import { literal, px, scalePx } from '../scale';

/** Fixed 16:9 canvas and its one-line footer. */
export const frame = {
  // Canvas, not spacing: the deck is a fixed 1920x1080 surface.
  width: px(1920),
  height: px(1080),
  paddingTop: space.px112,
  paddingX: space.px128,
  paddingBottom: space.px120,
  standalonePadding: space.px96,
  /** Heading to body. */
  bodyGap: space.px48,
  footerBottom: space.px48,
  footerGap: space.px14,
  brandFontWeight: font.weight.semibold,
  separator: literal('·'),
  logoSize: px(28),
} as const;

/** Width inside the frame's side padding, which a row of columns shares. */
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
