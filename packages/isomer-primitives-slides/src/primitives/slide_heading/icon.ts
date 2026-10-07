/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'blue',
  ({ accent, fg }) =>
    `<rect x="3" y="4" width="10" height="2.5" rx=".5" fill="${accent}"/><path d="M3 10h7M3 12.5h5" stroke="${fg}"/>`
);
