/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A large value, centered, over its label. */
export const icon = chartsIcon(
  ({ accent, fg }) =>
    `<rect x="4" y="4.5" width="8" height="4" rx="1" fill="${accent}"/><path d="M5.5 11.5h5" stroke="${fg}"/>`
);
