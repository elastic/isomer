/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { requiredString } from '../define/zod_helpers';

// The one URL trust policy every URL-bearing field goes through, as a Zod
// refinement and again as render-time sanitization. See `docs/url-trust.md`.

const NAMED_REFERENCES: Readonly<Record<string, string>> = {
  bsol: '\\',
  colon: ':',
  gt: '>',
  lt: '<',
  newline: '\n',
  sol: '/',
  tab: '\t',
};

// Numeric references, which browsers decode without a trailing `;`, and the
// named ones that spell a scheme, path, or tag character.
const CHARACTER_REFERENCE_RE =
  /&(?:#x([0-9a-f]+);?|#([0-9]+);?|(bsol|colon|gt|lt|newline|sol|tab);)/gi;

const decodeReference = (
  match: string,
  hex: string | undefined,
  decimal: string | undefined,
  name: string | undefined
): string => {
  if (name) {
    return NAMED_REFERENCES[name.toLowerCase()] ?? match;
  }
  const codePoint = Number.parseInt(hex ?? decimal ?? '', hex ? 16 : 10);
  return codePoint > 0 && codePoint <= 0x10ffff
    ? String.fromCodePoint(codePoint)
    : '\ufffd';
};

// The control characters browsers drop when parsing a URL.
const stripControls = (value: string): string =>
  // eslint-disable-next-line no-control-regex -- stripping control characters is the point.
  value.replace(/[\u0000-\u001f\u007f]/g, '').trim();

// The URL as a sink sees it: references decoded once, then controls stripped,
// so an obfuscated scheme is checked as it would act. Only the decision reads
// it; the policy returns the authored value, since a consumer that decodes
// again must decode what was checked, not a decoded copy.
const decisionForm = (value: string): string =>
  stripControls(value.replace(CHARACTER_REFERENCE_RE, decodeReference));

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

// Whether a URL in decision form passes, given which schemes are allowed.
const passes = (decided: string, schemes: RegExp): boolean =>
  decided !== '' &&
  !PROTOCOL_RELATIVE_RE.test(decided) &&
  !HAS_ANGLE_BRACKET_RE.test(decided) &&
  (!HAS_SCHEME_RE.test(decided) || schemes.test(decided));

/**
 * Returns the URL, trimmed and with control characters stripped, when it
 * satisfies the navigation policy (`https:` / `http:` / `mailto:` / relative
 * path), `null` otherwise.
 */
export const sanitizeNavigationHref = (href: string): string | null =>
  passes(decisionForm(href), NAVIGATION_SCHEME_RE) ? stripControls(href) : null;

/**
 * Returns the URL, trimmed and with control characters stripped, when it
 * satisfies the asset policy (`https:` / `http:` / relative path /
 * `data:image/*`), `null` otherwise.
 */
export const sanitizeAssetUrl = (url: string): string | null =>
  passes(decisionForm(url), ASSET_SCHEME_RE) ? stripControls(url) : null;

/** Checks a Markdown parser's decoded destination without decoding it again. */
export const sanitizeParsedNavigationHref = (href: string): string | null => {
  const normalized = stripControls(href);
  return passes(normalized, NAVIGATION_SCHEME_RE) ? normalized : null;
};

/** Checks a Markdown parser's decoded image destination. */
export const sanitizeParsedAssetUrl = (url: string): string | null => {
  const normalized = stripControls(url);
  return passes(normalized, ASSET_SCHEME_RE) ? normalized : null;
};

/**
 * Render-time replacement for a navigation href that failed the policy: an
 * inert same-document link, so the label stays visible without a destination.
 */
export const BLOCKED_HREF = '#';

/** What {@link navigationHref} accepts, for a field description to state. */
export const NAVIGATION_HREF_RULE =
  'an https, http, or mailto URL, or a relative path';

/** What {@link assetUrl} accepts, for a field description to state. */
export const ASSET_URL_RULE =
  'an https, http, or data:image URL, or a relative path';

/** Validation message for {@link navigationHref}. */
export const NAVIGATION_HREF_MESSAGE = `must be ${NAVIGATION_HREF_RULE}`;

/** Validation message for {@link assetUrl}. */
export const ASSET_URL_MESSAGE = `must be ${ASSET_URL_RULE}`;

/** Options for {@link navigationHref} and {@link assetUrl}. */
export interface UrlSchemaOptions {
  /** Longest accepted value, in characters. */
  max?: number;
}

const urlSchema = (
  passes: (value: string) => boolean,
  rule: string,
  message: string,
  { max }: UrlSchemaOptions
) =>
  (max === undefined ? requiredString() : requiredString().max(max))
    .refine(passes, { error: message })
    .describe(`${rule[0]!.toUpperCase()}${rule.slice(1)}.`);

/**
 * Zod schema for an `href`-like field: the validation layer of the two-layer
 * policy, paired with {@link sanitizeNavigationHref} at render time.
 *
 * Its description states the rule, since a refinement's message does not
 * reach the authoring JSON Schema. A field that describes itself should end
 * with {@link NAVIGATION_HREF_RULE} so the model still reads it.
 */
export const navigationHref = (options: UrlSchemaOptions = {}) =>
  urlSchema(
    (value) => sanitizeNavigationHref(value) !== null,
    NAVIGATION_HREF_RULE,
    NAVIGATION_HREF_MESSAGE,
    options
  );

/**
 * Zod schema for a `src`-like field, paired with {@link sanitizeAssetUrl} at
 * render time. Describes itself as {@link navigationHref} does, with
 * {@link ASSET_URL_RULE}.
 */
export const assetUrl = (options: UrlSchemaOptions = {}) =>
  urlSchema(
    (value) => sanitizeAssetUrl(value) !== null,
    ASSET_URL_RULE,
    ASSET_URL_MESSAGE,
    options
  );
