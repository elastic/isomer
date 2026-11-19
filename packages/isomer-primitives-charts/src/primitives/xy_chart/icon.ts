/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsIcon } from '../../theme';

/** Axes and a rising line through its points. */
export const icon = chartsIcon(
  ({ accent, fg }) =>
    `<polyline points="3 3 3 13 13 13" stroke="${fg}"/><polyline points="5 10.5 7.5 7.5 9.5 9 12.5 4.5" stroke="${accent}"/>`
);
