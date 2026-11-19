/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** Words of three sizes. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<path d="M3 6h5" stroke="${accent}" stroke-width="2.5"/><path d="M9.5 6h3.5M3 9.5h3M7.5 9.5h5.5" stroke="${fg}"/><path d="M4 12.5h3M8.5 12.5h3" stroke="${muted}"/>`
);
