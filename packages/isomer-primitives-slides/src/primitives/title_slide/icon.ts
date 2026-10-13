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
    `<rect x="3" y="4" width="6" height="2.5" rx=".5" fill="${accent}"/><path d="M3 9h4" stroke="${fg}"/><circle cx="11.5" cy="10.5" r="2" fill="${muted}"/>`
);
