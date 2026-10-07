/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'green',
  ({ accent, fg, muted }) =>
    `<path d="M3 4.5h10M3 7.5h7" stroke="${muted}"/><circle cx="3.75" cy="11.5" r="1" fill="${accent}"/><path d="M6.5 11.5h5" stroke="${fg}"/>`
);
