/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'teal',
  ({ accent, fg, muted }) =>
    `<path d="M3.5 8h9" stroke="${fg}"/><rect x="2.25" y="6.75" width="2.5" height="2.5" rx=".5" fill="${muted}"/><rect x="6.75" y="6.75" width="2.5" height="2.5" rx=".5" fill="${muted}"/><rect x="11.25" y="6.75" width="2.5" height="2.5" rx=".5" fill="${accent}"/>`
);
