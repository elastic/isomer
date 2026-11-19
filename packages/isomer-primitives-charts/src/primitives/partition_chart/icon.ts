/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A pie with one slice pulled out. */
export const icon = chartsIcon(
  ({ accent, fg, muted }) =>
    `<path d="M7.5 3.5a5 5 0 1 0 5 5h-5z" fill="${muted}"/><path d="M9 2v5h5a5 5 0 0 0-5-5z" fill="${accent}"/><path d="M7.5 3.5a5 5 0 1 0 5 5" stroke="${fg}"/>`
);
