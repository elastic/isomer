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
    `<path d="M3 4.5h2.5" stroke="${accent}"/><path d="M3 8h2.5M3 11.5h2.5" stroke="${muted}"/><path d="M8 4.5h5M8 8h5M8 11.5h3.5" stroke="${fg}"/>`
);
