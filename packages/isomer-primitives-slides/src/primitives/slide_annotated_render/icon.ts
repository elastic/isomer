/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'violet',
  ({ accent, fg, muted }) =>
    `<rect x="2.5" y="3.5" width="8" height="9" rx="1" fill="${muted}"/><circle cx="5" cy="6.5" r="1.25" fill="${accent}"/><circle cx="8" cy="10" r="1.25" fill="${fg}"/><path d="M12.5 6h1M12.5 9.5h1" stroke="${fg}"/>`
);
