/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** Panels of different sizes on a dashboard. */
export const icon = chartsIcon(
  ({ accent, muted }) =>
    `<rect x="3" y="3" width="4" height="4" rx="1" fill="${accent}"/><rect x="8.5" y="3" width="4.5" height="4" rx="1" fill="${muted}"/><rect x="3" y="8.5" width="10" height="4.5" rx="1" fill="${muted}"/>`
);
