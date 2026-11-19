/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** A panel that can't be drawn: a frame crossed out. */
export const icon = chartsIcon(
  ({ accent, fg }) =>
    `<rect x="3" y="3" width="10" height="10" rx="1.5" stroke="${fg}"/><path d="M5.5 10.5l5-5" stroke="${accent}"/>`
);
