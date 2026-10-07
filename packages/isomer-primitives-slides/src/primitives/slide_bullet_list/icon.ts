/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'green',
  ({ accent, fg, muted }) =>
    `<path d="M3.5 5l1 1 2-2" stroke="${accent}"/><circle cx="5" cy="8.25" r="1" fill="${fg}"/><path d="M4 10.75l2 2M6 10.75l-2 2" stroke="${muted}"/><path d="M8.5 5h4.5M8.5 8.25h4.5" stroke="${fg}"/><path d="M8.5 11.75h3" stroke="${muted}"/>`
);
