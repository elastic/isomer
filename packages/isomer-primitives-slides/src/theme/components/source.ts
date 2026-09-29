/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type } from '../base';
import { literal } from '../scale';

import { glyph } from './shared';

export const source = {
  text: type.chrome,
  label: literal('Source'),
  separator: glyph.separator,
} as const;
