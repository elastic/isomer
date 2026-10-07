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
    `<path d="M6.5 5h3M5.75 6.5 7.25 9.5M10.25 6.5 8.75 9.5" stroke="${fg}"/><circle cx="5" cy="5" r="1.75" fill="${accent}"/><circle cx="11" cy="5" r="1.5" fill="${muted}"/><circle cx="8" cy="11" r="1.5" fill="${muted}"/>`
);
