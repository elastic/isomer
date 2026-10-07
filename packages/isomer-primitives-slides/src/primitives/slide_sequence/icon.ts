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
    `<path d="M4.5 3v10M11.5 3v10" stroke="${muted}"/><path d="M4.5 6h7M9.5 4.5l2 1.5-2 1.5" stroke="${accent}"/><path d="M11.5 10h-7M6.5 8.5l-2 1.5 2 1.5" stroke="${fg}"/>`
);
