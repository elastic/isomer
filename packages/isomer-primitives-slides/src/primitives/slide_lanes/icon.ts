/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'teal',
  ({ accent, fg }) =>
    `<path d="M3 5h4.5l4 3H13" stroke="${fg}"/><path d="M3 11h4.5l4-3" stroke="${accent}"/>`
);
