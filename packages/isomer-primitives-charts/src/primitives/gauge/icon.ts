/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A dial with a needle. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<path d="M3 11.5a5 5 0 0 1 10 0" stroke="${muted}"/><path d="M3 11.5a5 5 0 0 1 3.5-4.77" stroke="${accent}"/><path d="M8 11.5l2.5-3.5" stroke="${fg}"/>`
);
