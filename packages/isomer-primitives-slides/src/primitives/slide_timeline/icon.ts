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
    `<path d="M3 8h10" stroke="${muted}"/><circle cx="4" cy="8" r="1.25" fill="${fg}"/><circle cx="8" cy="8" r="1.25" fill="${fg}"/><circle cx="12" cy="8" r="1.75" fill="${accent}"/>`
);
