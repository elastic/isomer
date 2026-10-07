/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'yellow',
  ({ accent, muted }) =>
    `<path d="M4 6.5a1.5 1.5 0 1 1 3 0c0 2-1 3.5-3 4" stroke="${accent}"/><path d="M9 6.5a1.5 1.5 0 1 1 3 0c0 2-1 3.5-3 4" stroke="${muted}"/>`
);
