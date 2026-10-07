/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'yellow',
  ({ accent, muted }) =>
    `<rect x="2.5" y="3.5" width="7" height="3.5" rx="1.5" fill="${muted}"/><rect x="6.5" y="9" width="7" height="3.5" rx="1.5" fill="${accent}"/>`
);
