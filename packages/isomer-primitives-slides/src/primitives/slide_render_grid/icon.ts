/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'violet',
  ({ accent, fg }) =>
    `<rect x="2.5" y="5" width="3" height="6" rx=".5" stroke="${fg}"/><rect x="6.5" y="5" width="3" height="6" rx=".5" fill="${accent}"/><rect x="10.5" y="5" width="3" height="6" rx=".5" stroke="${fg}"/>`
);
