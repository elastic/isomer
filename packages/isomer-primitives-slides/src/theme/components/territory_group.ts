/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { space, stroke, type } from '../base';
import { literal } from '../scale';

export const territoryGroup = {
  gap: space.px64,
  rule: stroke.bar,
  paddingLeft: space.px32,
  titleGap: space.px16,
  body: type.bodyL,
  /** What assistive technology announces for each tone's cue. */
  toneLabel: { primary: literal('Yours'), accent: literal('Another party') },
} as const;
