/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'blue',
  ({ accent, fg, muted }) =>
    `<path d="M8 3l5 2.5L8 8 3 5.5z" fill="${accent}"/><path d="M3 8.25l5 2.5 5-2.5" stroke="${muted}"/><path d="M3 10.75l5 2.5 5-2.5" stroke="${fg}"/>`
);
