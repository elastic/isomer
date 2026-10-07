/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'yellow',
  ({ accent, fg, muted }) =>
    `<rect x="3" y="4" width="3" height="2" rx=".5" fill="${accent}"/><rect x="3" y="10" width="3" height="2" rx=".5" fill="${muted}"/><path d="M7.5 5h5.5M7.5 11h5.5" stroke="${fg}"/>`
);
