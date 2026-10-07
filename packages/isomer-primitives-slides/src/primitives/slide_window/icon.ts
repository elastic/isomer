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
    `<rect x="2.5" y="3.5" width="11" height="9" rx="1" stroke="${fg}"/><path d="M2.5 6.5h11" stroke="${fg}"/><circle cx="4.75" cy="5" r=".75" fill="${accent}"/><circle cx="7" cy="5" r=".75" fill="${muted}"/>`
);
