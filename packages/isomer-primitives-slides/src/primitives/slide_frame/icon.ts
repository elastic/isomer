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
    `<rect x="2.5" y="4" width="11" height="8" rx="1" stroke="${fg}"/><path d="M4.5 6.5h4" stroke="${accent}"/><path d="M4.5 10h7" stroke="${muted}"/>`
);
