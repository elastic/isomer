/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A label above a large value, and a trend under it. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<path d="M4 4.5h4" stroke="${muted}"/><rect x="4" y="6.5" width="8" height="3" rx="1" fill="${accent}"/><polyline points="4 12 6.5 11 9 11.5 12 10" stroke="${fg}"/>`
);
