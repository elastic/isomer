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
    `<circle cx="4.5" cy="4.5" r="1.1" fill="${muted}"/><circle cx="8" cy="4.5" r="1.1" fill="${muted}"/><circle cx="11.5" cy="4.5" r="1.1" fill="${muted}"/><circle cx="4.5" cy="8" r="1.1" fill="${muted}"/><circle cx="8" cy="8" r="1.1" fill="${accent}"/><circle cx="11.5" cy="8" r="1.1" fill="${muted}"/><circle cx="4.5" cy="11.5" r="1.1" fill="${muted}"/><circle cx="8" cy="11.5" r="1.1" fill="${muted}"/><circle cx="11.5" cy="11.5" r="1.1" fill="${muted}"/>`
);
