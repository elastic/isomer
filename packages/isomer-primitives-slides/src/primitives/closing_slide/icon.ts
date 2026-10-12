/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../../theme/icon_hues';

export const icon = slideIcon(
  'green',
  ({ accent, fg }) =>
    `<path d="M9 3.5h3.5V7M12.5 3.5l-5 5" stroke="${accent}"/><path d="M10.5 9.5v3h-7V5.5h3" stroke="${fg}"/>`
);
