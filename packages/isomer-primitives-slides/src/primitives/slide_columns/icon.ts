/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'blue',
  ({ accent, muted }) =>
    `<rect x="3" y="3" width="2.5" height="10" rx=".5" fill="${muted}"/><rect x="6.75" y="3" width="2.5" height="10" rx=".5" fill="${accent}"/><rect x="10.5" y="3" width="2.5" height="10" rx=".5" fill="${muted}"/>`
);
