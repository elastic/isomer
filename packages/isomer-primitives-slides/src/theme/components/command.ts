/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, monoAdvance, radius, space, stroke, type } from '../base';
import { literal, scalePx } from '../scale';

import { frameContentWidth } from './frame';
import { label } from './shared';

export const command = {
  labelGap: label.gap,
  border: stroke.panel,
  radius: radius.panel,
  paddingX: space.px40,
  paddingY: space.px32,
  gap: space.px24,
  text: { ...type.mono, lineHeight: font.lineHeight.item },
  textSizes: { l: font.size.px38, m: font.size.px32, s: font.size.px28 },
  prompt: literal('$'),
  copy: {
    label: literal('Copy'),
    size: font.size.px24,
    border: stroke.panel,
    radius: radius.chipSmall,
    paddingX: space.px14,
    paddingY: space.px4,
  },
} as const;

const { copy, prompt } = command;

// The Copy chip is reserved on every surface, so each picks the same step.
const copyWidth =
  monoAdvance * [...copy.label.value].length * scalePx(copy.size) +
  2 * scalePx(copy.paddingX) +
  2 * scalePx(copy.border);

/** The frame's width less the panel's padding, border, gaps, and Copy chip. */
export const commandLineWidth =
  frameContentWidth -
  2 * scalePx(command.paddingX) -
  2 * scalePx(command.border) -
  2 * scalePx(command.gap) -
  copyWidth;

export const commandMaxLength =
  Math.floor(commandLineWidth / (monoAdvance * scalePx(command.textSizes.s))) -
  [...prompt.value].length;
