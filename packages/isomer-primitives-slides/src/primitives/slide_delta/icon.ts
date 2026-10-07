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
    `<path d="M3 13h10" stroke="${muted}"/><path d="M8 11V3.5M5 6.5l3-3 3 3" stroke="${accent}"/>`
);
