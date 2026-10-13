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
    `<rect x="2.5" y="5.5" width="11" height="3" rx=".5" fill="${accent}"/><path d="M4 11h8" stroke="${muted}"/>`
);
