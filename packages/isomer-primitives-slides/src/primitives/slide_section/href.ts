/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

/** A line's link, or `undefined` when it has none or its href was unsafe. */
export const lineHref = (
  hrefs: readonly string[] | undefined,
  index: number
): string | undefined => {
  const authored = hrefs?.[index];
  return (authored && sanitizeNavigationHref(authored)) || undefined;
};
