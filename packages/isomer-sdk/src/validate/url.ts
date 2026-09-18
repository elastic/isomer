/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString } from '../define/zod_helpers';

// The one URL trust policy every URL-bearing field goes through, as a Zod
// refinement and again as render-time sanitization. See `docs/url-trust.md`.

// Strips the control characters browsers drop when parsing a URL and decodes
// entity-encoded colons, so an obfuscated scheme is checked as a sink sees it.
const normalizeUrl = (value: string): string =>
  value
    // eslint-disable-next-line no-control-regex -- stripping control characters is the point.
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/&(?:colon|#0*58|#x0*3a);/gi, ':')
    .trim();

// `<` and `>` must be percent-encoded in a URL, so their unencoded presence
// means the value is malformed or a parser-confusion attempt (an unterminated
// `<dest` would otherwise read as a relative path). Reject rather than strip.
const HAS_ANGLE_BRACKET_RE = /[<>]/;
const HAS_SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i;
const NAVIGATION_SCHEME_RE = /^(?:https?|mailto):/i;
const ASSET_SCHEME_RE = /^(?:https?:|data:image\/)/i;
// `//host` — and the `\` variants browsers fold into `/` — resolve against the
// current protocol onto a foreign host, so they are not relative paths.
const PROTOCOL_RELATIVE_RE = /^[/\\][/\\]/;

/**
 * Returns the normalized URL when it satisfies the navigation policy
 * (`https:` / `http:` / `mailto:` / relative path), `null` otherwise.
 */
export const sanitizeNavigationHref = (href: string): string | null => {
  const normalized = normalizeUrl(href);
  if (
    !normalized ||
    PROTOCOL_RELATIVE_RE.test(normalized) ||
    HAS_ANGLE_BRACKET_RE.test(normalized)
  ) {
    return null;
  }
  if (HAS_SCHEME_RE.test(normalized)) {
    return NAVIGATION_SCHEME_RE.test(normalized) ? normalized : null;
  }
  return normalized;
};

/**
 * Returns the normalized URL when it satisfies the asset policy (`https:` /
 * `http:` / relative path / `data:image/*`), `null` otherwise.
 */
export const sanitizeAssetUrl = (url: string): string | null => {
  const normalized = normalizeUrl(url);
  if (
    !normalized ||
    PROTOCOL_RELATIVE_RE.test(normalized) ||
    HAS_ANGLE_BRACKET_RE.test(normalized)
  ) {
    return null;
  }
  if (HAS_SCHEME_RE.test(normalized)) {
    return ASSET_SCHEME_RE.test(normalized) ? normalized : null;
  }
  return normalized;
};

/**
 * Render-time replacement for a navigation href that failed the policy: an
 * inert same-document link, so the label stays visible without a destination.
 */
export const BLOCKED_HREF = '#';

/** Validation message for {@link navigationHref}. */
export const NAVIGATION_HREF_MESSAGE =
  'must be an https, http, or mailto URL, or a relative path';

/** Validation message for {@link assetUrl}. */
export const ASSET_URL_MESSAGE =
  'must be an https, http, or data:image URL, or a relative path';

/**
 * Zod schema for an `href`-like field: the validation layer of the two-layer
 * policy, paired with {@link sanitizeNavigationHref} at render time.
 */
export const navigationHref = () =>
  requiredString().refine((value) => sanitizeNavigationHref(value) !== null, {
    error: NAVIGATION_HREF_MESSAGE,
  });

/**
 * Zod schema for a `src`-like field, paired with {@link sanitizeAssetUrl} at
 * render time.
 */
export const assetUrl = () =>
  requiredString().refine((value) => sanitizeAssetUrl(value) !== null, {
    error: ASSET_URL_MESSAGE,
  });
