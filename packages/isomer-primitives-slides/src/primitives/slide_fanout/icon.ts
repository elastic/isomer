/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'teal',
  ({ accent, fg, muted }) =>
    `<path d="M5.5 8 11 4.5M5.5 8H11M5.5 8l5.5 3.5" stroke="${fg}"/><circle cx="4" cy="8" r="1.75" fill="${accent}"/><circle cx="12" cy="4" r="1.25" fill="${muted}"/><circle cx="12" cy="8" r="1.25" fill="${muted}"/><circle cx="12" cy="12" r="1.25" fill="${muted}"/>`
);
