/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { font, radius, space, stroke, type } from '../base';
import { literal, paddingXy } from '../scale';

export const transcript = {
  roleLabel: {
    host: literal('Host'),
    model: literal('Model'),
    user: literal('User'),
  },
  headingGap: space.px16,
  gap: space.px18,
  border: stroke.panel,
  radius: radius.panel,
  padding: paddingXy(space.px14, space.px22),
  labelGap: space.px6,
  label: { ...type.label, tracking: font.tracking.label },
  userMaxWidth: literal('70%'),
  otherMaxWidth: literal('92%'),
  prose: {
    size: font.size.px30,
    weight: font.weight.regular,
    lineHeight: font.lineHeight.compact,
  },
  code: { ...type.mono, lineHeight: font.lineHeight.compact },
} as const;
