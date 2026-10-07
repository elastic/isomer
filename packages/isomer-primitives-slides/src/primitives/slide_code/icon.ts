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
    `<rect x="2.5" y="3" width="11" height="10" rx="1" fill="${muted}"/><path d="M5 6h4M5 11h3" stroke="${fg}"/><path d="M6.5 8.5h5" stroke="${accent}"/>`
);
