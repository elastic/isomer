/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'blue',
  ({ accent, fg, muted }) =>
    `<path d="M5 4v8" stroke="${muted}"/><circle cx="5" cy="4" r="1.25" fill="${muted}"/><circle cx="5" cy="8" r="1.5" fill="${accent}"/><circle cx="5" cy="12" r="1.25" fill="${muted}"/><path d="M8.5 4h4.5M8.5 8h4.5M8.5 12h4.5" stroke="${fg}"/>`
);
