/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';

export const FRAME_URL_MESSAGE =
  'must be an absolute http or https URL, such as "https://example.com"';

/** Absolute `http(s)` only: a footer address has no page to be relative to. */
export const sanitizeFrameUrl = (url: string): string | null => {
  const safe = sanitizeNavigationHref(url);
  if (!safe || !URL.canParse(safe)) {
    return null;
  }
  const { protocol, hostname } = new URL(safe);
  return (protocol === 'http:' || protocol === 'https:') && hostname
    ? safe
    : null;
};

/** The address without its scheme, in any case the scheme was written. */
export const displayFrameUrl = (url: string): string =>
  url.replace(/^https?:\/\//i, '');
