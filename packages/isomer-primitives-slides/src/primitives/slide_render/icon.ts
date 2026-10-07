/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'violet',
  ({ accent, fg, muted }) =>
    `<rect x="2.5" y="3.5" width="11" height="9" rx="1" fill="${muted}"/><path d="M4.5 11 7 8l2 2 1.5-1.5L12 11" stroke="${fg}"/><circle cx="10.5" cy="6" r="1" fill="${accent}"/>`
);
