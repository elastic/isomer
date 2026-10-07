/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'indigo',
  ({ accent, muted }) =>
    `<rect x="3" y="3" width="10" height="3" rx=".5" fill="${accent}"/><path d="M3 8.5h10M3 11.5h10M7.5 7v6" stroke="${muted}"/>`
);
