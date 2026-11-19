/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A shaded header row above rules. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<rect x="3" y="3" width="10" height="3" rx="1" fill="${accent}"/><path d="M3 8.5h10M3 11h10M3 13.5h10" stroke="${fg}"/><path d="M7.5 7v6.5" stroke="${muted}"/>`
);
