/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

/** `slideWindow`: a panel with one title bar. */
export const window = {
  border: stroke.panel,
  radius: radius.panel,
  bar: { ...type.mono, size: font.size.px24 },
  barPadding: paddingXy(space.px12, space.px24),
  slackBar: {
    size: font.size.px26,
    weight: font.weight.bold,
    lineHeight: font.lineHeight.body,
  },
  slackBarPadding: paddingXy(space.px16, space.px28),
  channelPrefix: literal('#'),
  bodyPadding: paddingXy(space.px16, space.px24),
  slackBodyPadding: space.px28,
  bodyGap: space.px24,
} as const;
