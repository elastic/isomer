/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideIcon } from '../src/theme/icon_hues';

/** Two stacked slides with a play mark: the Decks app in the Studio's nav and on its Home page. */
export const decksIcon = slideIcon(
  'violet',
  ({ accent, fg, muted }) =>
    `<rect x="2.5" y="5" width="9" height="7" rx="1" stroke="${muted}"/><rect x="4.5" y="3" width="9" height="7" rx="1" fill="${fg}" stroke="${fg}"/><path d="M8 5.5v2.5l2.2-1.25Z" fill="${accent}" stroke="${accent}"/>`
);
