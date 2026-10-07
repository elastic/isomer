/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'indigo',
  ({ accent, fg, muted }) =>
    `<path d="M8 3v10M3 8h10" stroke="${fg}"/><circle cx="11" cy="5" r="1.5" fill="${accent}"/><circle cx="5" cy="11" r="1.25" fill="${muted}"/><circle cx="5" cy="5.5" r="1.25" fill="${muted}"/>`
);
