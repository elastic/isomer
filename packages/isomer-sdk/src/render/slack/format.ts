/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Slack mrkdwn helpers.
//
// Slack uses a flavour of Markdown called "mrkdwn" that differs from CommonMark
// in subtle ways: links are `<url|label>`, code uses single backticks (or
// fenced ```` ``` ```` blocks), and `&`, `<`, `>` must be HTML-escaped inside
// any text element. These helpers centralize the escaping so primitive
// renderers cannot accidentally emit a literal `<https://...>` that Slack
// would parse as auto-link with no label.
//
// See https://api.slack.com/reference/surfaces/formatting

import { sanitizeNavigationHref } from '../../validate/url';

import { SLACK_LIMITS } from './blocks';

const MRKDWN_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

/**
 * Escapes the three characters Slack treats as HTML in `mrkdwn` text.
 *
 * The formatting markers (`*`, `_`, `~`, `` ` ``) are left intact so callers
 * can compose markdown with them. Wrap text in {@link code} when literal
 * asterisks are needed.
 */
export const escapeMrkdwn = (value: string): string =>
  value.replace(/[&<>]/g, (match) => MRKDWN_ESCAPES[match] ?? match);

/** `text` escaped and wrapped in mrkdwn bold markers. */
export const bold = (text: string): string => `*${escapeMrkdwn(text)}*`;
/** `text` escaped and wrapped in mrkdwn italic markers. */
export const italic = (text: string): string => `_${escapeMrkdwn(text)}_`;
/** `text` escaped and wrapped in mrkdwn strikethrough markers. */
export const strike = (text: string): string => `~${escapeMrkdwn(text)}~`;

/**
 * Inline code span. Contents are not mrkdwn-escaped, since `<` and friends are
 * literal inside a code span; only embedded backticks are demoted, to a
 * modifier letter that cannot close the span.
 */
export const code = (text: string): string =>
  `\`${text.replace(/`/g, '\u02CB')}\``;

/**
 * Fenced code block. Slack honours the triple-backtick fence but not a language
 * hint. Embedded triple-backticks are demoted with a zero-width joiner so they
 * cannot terminate the block early.
 */
export const codeBlock = (text: string): string =>
  `\`\`\`\n${text.replace(/```/g, '``\u200d`')}\n\`\`\``;

const URL_PARTS_RE = /^([a-z][a-z0-9+.-]*:(?:\/\/[^/?#]*)?)(.*)$/is;
// Letter, digit, and hyphen labels, with an optional DNS root dot.
const DNS_NAME_RE =
  /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.?$/i;
const IPV6_HOST_RE = /^\[[0-9a-f:.]+\]$/i;

const MALFORMED_ESCAPE_RE = /%(?![0-9a-f]{2})/i;

// `url` parsed, when its escapes are well formed and `URL` prints it as
// written up to the case of its scheme and authority and a `/` for an empty
// path.
const parsedAsWritten = (url: string): URL | null => {
  if (MALFORMED_ESCAPE_RE.test(url)) {
    return null;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const [, prefix, rest] = URL_PARTS_RE.exec(url) ?? [];
  const [, printedPrefix, printedRest] = URL_PARTS_RE.exec(parsed.href) ?? [];
  return prefix !== undefined &&
    prefix.toLowerCase() === printedPrefix?.toLowerCase() &&
    (printedRest === rest || printedRest === `/${rest}`)
    ? parsed
    : null;
};

/**
 * Whether `url` is an `http:` or `https:` URL with a DNS or IPv6 host that
 * `URL` prints as written, so nothing it repairs or encodes, such as a
 * backslash, whitespace, or non-ASCII, passes.
 */
export const isAbsoluteHttpUrl = (url: string): boolean => {
  const parsed = parsedAsWritten(url);
  return (
    (parsed?.protocol === 'http:' || parsed?.protocol === 'https:') &&
    (DNS_NAME_RE.test(parsed.hostname) || IPV6_HOST_RE.test(parsed.hostname))
  );
};

// RFC 5322 dot-atom text, less `/`, `?`, `#`, and `%`.
const LOCAL_PART_RE =
  /^[a-z0-9!$&'*+=^_`{|}~-]+(?:\.[a-z0-9!$&'*+=^_`{|}~-]+)*$/i;

const isMailbox = (recipient: string): boolean => {
  const at = recipient.lastIndexOf('@');
  return (
    at > 0 &&
    LOCAL_PART_RE.test(recipient.slice(0, at)) &&
    DNS_NAME_RE.test(recipient.slice(at + 1))
  );
};

const decoded = (value: string): string | null => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

// Every comma-separated recipient before the query or fragment is a mailbox.
const isMailtoUrl = (url: string): boolean => {
  const [, recipients] = /^mailto:([^?#]*)/i.exec(url) ?? [];
  return (
    recipients !== undefined &&
    parsedAsWritten(url) !== null &&
    recipients
      .split(',')
      .every((recipient) => isMailbox(decoded(recipient) ?? ''))
  );
};

/**
 * `href` when {@link sanitizeNavigationHref} passes it and it is an `http:` or
 * `https:` URL with a host, or a `mailto:` of well-formed mailboxes; `null`
 * otherwise. Slack has no page to resolve a relative URL against.
 */
export const slackLinkUrl = (href: string): string | null => {
  const url = sanitizeNavigationHref(href);
  if (url === null) {
    return null;
  }
  return isAbsoluteHttpUrl(url) || isMailtoUrl(url) ? url : null;
};

/**
 * Slack mrkdwn link, `<url|label>`, or a bare `<url>` when `label` is omitted.
 *
 * URL and label are both escaped so `&` and `>` cannot break Slack's link
 * parser, and a `|` in the URL is percent-encoded so it cannot end the URL
 * early. A URL {@link slackLinkUrl} rejects degrades to plain escaped text
 * with no link.
 */
export const link = (url: string, label?: string): string => {
  const sanitized = slackLinkUrl(url);
  if (!sanitized) {
    return escapeMrkdwn(label ?? url);
  }
  const safeUrl = escapeMrkdwn(sanitized).replaceAll('|', '%7C');
  if (!label) {
    return `<${safeUrl}>`;
  }
  return `<${safeUrl}|${escapeMrkdwn(label)}>`;
};

/**
 * Truncates `value` to `max` UTF-16 code units at a grapheme boundary,
 * appending an ellipsis when it had to cut. Pass a `SLACK_LIMITS` constant as
 * the budget.
 */
export const clampSlackText = (value: string, max: number): string => {
  if (value.length <= max) {
    return value;
  }
  const budget = max <= 1 ? max : max - 1;
  let end = 0;
  for (const { index, segment } of new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
  }).segment(value)) {
    if (index + segment.length > budget) {
      break;
    }
    end = index + segment.length;
  }
  const head = value.slice(0, end);
  return max <= 1 ? head : `${head.trimEnd()}…`;
};

// A `<…>` link or mention and an entity, each matched where it starts.
const LINK_TOKEN_RE = /<[^<>\n]*>/y;
const ENTITY_TOKEN_RE = /&(?:amp|lt|gt);/y;

// The end of the token `re` matches at `index`, or `undefined`.
const tokenEnd = (
  value: string,
  re: RegExp,
  index: number
): number | undefined => {
  re.lastIndex = index;
  return re.test(value) ? re.lastIndex : undefined;
};

/**
 * {@link clampSlackText} for `mrkdwn`: never cuts inside a `<…>` link or
 * mention or an entity. Formatting marks are left as they fall; Slack prints an
 * unclosed one as written.
 */
export const clampMrkdwn = (value: string, max: number): string => {
  const clamped = clampSlackText(value, max);
  if (clamped === value || max <= 1) {
    return clamped;
  }
  // Entity first: a link holds no `<` of its own, so stepping back to its
  // start cannot land inside an entity, while the reverse could.
  let cut = clamped.length - 1;
  const entity = value.lastIndexOf('&', cut - 1);
  if (entity !== -1 && (tokenEnd(value, ENTITY_TOKEN_RE, entity) ?? 0) > cut) {
    cut = entity;
  }
  const link = value.lastIndexOf('<', cut - 1);
  if (link !== -1 && (tokenEnd(value, LINK_TOKEN_RE, link) ?? 0) > cut) {
    cut = link;
  }
  return `${value.slice(0, cut).trimEnd()}…`;
};

/**
 * `value` cut to `max` UTF-16 code units, never through a surrogate pair. For
 * opaque values a host reads back, which an ellipsis would change.
 */
export const cutSlackValue = (value: string, max: number): string => {
  const cut = value.slice(0, max);
  return /[\ud800-\udbff]$/.test(cut) ? cut.slice(0, -1) : cut;
};

/**
 * Collapses whitespace and clamps to `SLACK_LIMITS.headerTextChars`. Header
 * text is `plain_text`, so no markdown survives — do not pre-format it.
 */
export const formatHeaderText = (value: string): string =>
  clampSlackText(
    value.replace(/\s+/g, ' ').trim(),
    SLACK_LIMITS.headerTextChars
  );
