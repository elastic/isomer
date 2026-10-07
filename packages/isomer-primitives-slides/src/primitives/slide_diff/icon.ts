/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'violet',
  ({ accent, fg, muted }) =>
    `<path d="M4 5.5h4M6 3.5v4" stroke="${accent}"/><path d="M4 11h4" stroke="${fg}"/><path d="M10.5 5.5H13M10.5 11H13" stroke="${muted}"/>`
);
