/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type } from '../base';
import { literal } from '../scale';

/** `slideSource`: one citation line at the foot of the slide body. */
export const source = {
  text: type.chrome,
  prefix: literal('Source ·'),
} as const;
