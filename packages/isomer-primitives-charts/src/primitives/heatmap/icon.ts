/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A grid of cells in three shades. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<rect x="3" y="3" width="3" height="3" fill="${accent}"/><rect x="6.5" y="3" width="3" height="3" fill="${muted}"/><rect x="10" y="3" width="3" height="3" fill="${fg}"/><rect x="3" y="6.5" width="3" height="3" fill="${muted}"/><rect x="6.5" y="6.5" width="3" height="3" fill="${fg}"/><rect x="10" y="6.5" width="3" height="3" fill="${accent}"/><rect x="3" y="10" width="3" height="3" fill="${fg}"/><rect x="6.5" y="10" width="3" height="3" fill="${accent}"/><rect x="10" y="10" width="3" height="3" fill="${muted}"/>`
);
