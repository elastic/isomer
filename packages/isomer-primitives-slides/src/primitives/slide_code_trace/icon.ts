/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

/** Two panels joined by an arrow. */
export const icon = slideIcon(
  'violet',
  ({ accent, fg, muted }) =>
    `<rect x="1.5" y="4" width="5" height="8" rx="1" fill="${muted}"/><rect x="9.5" y="4" width="5" height="8" rx="1" fill="${muted}"/><path d="M3 7h2M11 9h2" stroke="${fg}"/><path d="M6.5 8h3" stroke="${accent}"/>`
);
