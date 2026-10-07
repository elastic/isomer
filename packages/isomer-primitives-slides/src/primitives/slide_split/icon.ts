/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'blue',
  ({ accent, muted }) =>
    `<rect x="2.5" y="4" width="4.5" height="8" rx=".5" fill="${muted}"/><rect x="9" y="4" width="4.5" height="8" rx=".5" fill="${accent}"/>`
);
