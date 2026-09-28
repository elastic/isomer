/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import { font, space, stroke, type } from '../base';
import { literal, px, scalePx } from '../scale';

import { stat } from './stat';

const valueSizes = {
  l: type.stat.size,
  m: font.size.px128,
  s: font.size.px96,
} as const;

const perStep = (ratio: number) => {
  const at = (size: ScaleToken) => px(Math.round(scalePx(size) * ratio));
  return { l: at(valueSizes.l), m: at(valueSizes.m), s: at(valueSizes.s) };
};

/** `slideDelta`: a number before and after a change, and what the change means. */
export const delta = {
  columnGap: space.px56,
  // Arrow track from the mock; off the spacing ramp.
  arrowWidth: px(200),
  // The mock's 76px lift at 200px, which centers the arrow on the digits.
  arrowLifts: perStep(0.38),
  label: { ...type.label, tracking: font.tracking.label },
  labelGap: space.px24,
  value: type.stat,
  valueSizes,
  /** One `stat` line at each step, so a placeholder keeps the row's shape. */
  placeholderHeights: perStep(parseFloat(type.stat.lineHeight.value)),
  placeholderWidth: stat.placeholderWidth,
  placeholderCaption: stat.placeholderCaption,
  rule: stroke.hairline,
  notePadding: space.px56,
  noteGap: space.px16,
  noteBottom: space.px12,
  // The note's floor however wide the values run; a measure, not spacing.
  noteMinWidth: px(480),
  change: {
    size: font.size.px72,
    weight: font.weight.extrabold,
    tracking: font.tracking.heading,
    lineHeight: font.lineHeight.solid,
  },
  body: type.bodyL,
  /** Joins before and after in text, markdown, and Slack. */
  arrow: literal('→'),
} as const;
