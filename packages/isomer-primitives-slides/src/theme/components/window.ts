/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

const barPaddingY = space.px12;
const barPaddingX = space.px24;
const slackBarPaddingY = space.px16;
const slackBarPaddingX = space.px28;
const bodyPaddingY = space.px16;
const bodyPaddingX = space.px24;

export const window = {
  border: stroke.panel,
  radius: radius.panel,
  bar: { ...type.mono, size: font.size.px24 },
  barPaddingY,
  barPadding: paddingXy(barPaddingY, barPaddingX),
  slackBar: {
    size: font.size.px26,
    weight: font.weight.bold,
    lineHeight: font.lineHeight.body,
  },
  slackBarPaddingY,
  slackBarPadding: paddingXy(slackBarPaddingY, slackBarPaddingX),
  channelPrefix: literal('#'),
  bodyPaddingY,
  bodyPaddingX,
  bodyPadding: paddingXy(bodyPaddingY, bodyPaddingX),
  slackBodyPadding: space.px28,
  bodyGap: space.px24,
} as const;
