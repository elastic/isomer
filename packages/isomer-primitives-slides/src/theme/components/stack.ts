/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { space } from '../base';

/** `slideStack`: gaps between stacked nodes. */
export const stack = {
  spacing: {
    tight: space.px24,
    normal: space.px48,
    loose: space.px72,
  },
} as const;
