/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'teal',
  ({ accent, fg, muted }) =>
    `<path d="M3 5l3 3-3 3" stroke="${accent}"/><path d="M7 5l3 3-3 3" stroke="${fg}"/><path d="M11 5l2.5 3-2.5 3" stroke="${muted}"/>`
);
