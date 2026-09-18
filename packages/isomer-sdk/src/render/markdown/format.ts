/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared helpers for a pack's markdown renderers. The markdown surface targets
// rich text clients rather than a narrow host, so it does not share the text
// surface's measuring and wrapping.

import {
  BLOCKED_HREF,
  sanitizeAssetUrl,
  sanitizeNavigationHref,
} from '../../validate/url';

// Escapes label characters that could close a `[...]` early and smuggle in a
// hostile destination of their own.
const escapeLinkLabel = (label: string): string =>
  label.replace(/[[\]\\]/g, '\\$&');

// Percent-encodes destination characters that would terminate the `(...)`
// early or read as a link title. `encodeURIComponent` leaves `(` and `)`
// unescaped by spec, so those two are mapped by hand.
const escapeLinkDestination = (href: string): string =>
  href.replace(/[()\s]/g, (char) => {
    if (char === '(') return '%28';
    if (char === ')') return '%29';
    return encodeURIComponent(char);
  });

/**
 * Inline markdown link with the navigation URL policy applied — the render
 * layer of the two-layer defense in `src/validate/url.ts`. A blocked
 * destination becomes {@link BLOCKED_HREF}, keeping the label as a dead link.
 */
export const markdownLink = (label: string, href: string): string =>
  `[${escapeLinkLabel(label)}](${escapeLinkDestination(
    sanitizeNavigationHref(href) ?? BLOCKED_HREF
  )})`;

/**
 * Inline markdown image with the asset URL policy applied. A blocked source
 * degrades to the bare alt text.
 */
export const markdownImage = (alt: string, src: string): string => {
  const safeSrc = sanitizeAssetUrl(src);
  return safeSrc
    ? `![${escapeLinkLabel(alt)}](${escapeLinkDestination(safeSrc)})`
    : alt;
};

/**
 * Wraps already-rendered inline markdown (a {@link markdownImage}, say) in a
 * link without re-escaping the inner markdown.
 */
export const markdownLinkWrap = (inner: string, href: string): string =>
  `[${inner}](${escapeLinkDestination(
    sanitizeNavigationHref(href) ?? BLOCKED_HREF
  )})`;

// Inline link/image: `[label](dest)` / `![alt](dest)`, with the destination
// either angle-wrapped (`<dest>`) or bare. The bare form allows one level of
// balanced parens so a destination like `javascript:alert(1)` is captured whole
// rather than truncated at the inner `)`, and the optional title is matched
// separately so `[x](dest "title")` does not swallow the closing paren.
const INLINE_LINK_RE =
  /(!?)\[([^\]]*)\]\(\s*(?:<([^<>]*)>|((?:[^\s()]|\([^()]*\))*))\s*("[^"]*"|'[^']*')?\s*\)/g;
const AUTOLINK_RE = /<([a-z][a-z0-9+.-]*:[^<>\s]*)>/gi;
// Link reference definition: `[label]: destination "optional title"` at the
// start of a line (up to three leading spaces per CommonMark).
const REFERENCE_DEF_RE =
  /^( {0,3}\[[^\]]+\]:[ \t]*)(\S+)([ \t]+(?:"[^"]*"|'[^']*'|\([^)]*\)))?[ \t]*$/gm;
// Neutralizes raw HTML by escaping the opening `<` of anything tag-shaped: a
// `/`-or-letter start, and a `>` somewhere ahead (a `<` with no closing `>` is
// not a tag, so prose like `p95 <y` is left alone). Matching only the `<`
// position — rather than the whole tag — means a `<` nested inside an
// attribute value (`<iframe src="…<script>">`) is escaped too. The two
// negative lookaheads preserve URL autolinks (`<https://x>`, a colon follows
// the scheme) and email autolinks (`<sre@example.test>`); they key on shape,
// not safety, so de-bracketing an unsafe autolink stays the autolink pass's job.
const RAW_HTML_START_RE =
  /<(?!\/?[a-z][a-z0-9+.-]*:)(?![^\s<>@]+@[^\s<>@]+>)(?=\/?[a-zA-Z!?][^>]*>)/gi;

// Code spans and fenced blocks are never interpreted as links or HTML, so no
// pass may touch them: rewriting there would mangle inert sample text, and an
// entity like `&lt;` inside a code span renders literally rather than as `<`.
// `String.split` with a capturing group puts the delimiters at odd indices.
const CODE_SEGMENT_RE = /(```[\s\S]*?```|``[\s\S]*?``|`[^`\n]*`)/g;

// A destination may be wrapped in angle brackets (`[x](<dest>)`), which the
// URL policy would otherwise read as a relative path beginning with `<`.
const unwrapDestination = (dest: string): string => {
  const trimmed = dest.trim();
  return trimmed.startsWith('<') && trimmed.endsWith('>')
    ? trimmed.slice(1, -1).trim()
    : trimmed;
};

/**
 * Rewrites unsafe destinations out of authored markdown before it reaches a
 * markdown consumer. The `text` primitive's markdown surface emits authored
 * source, so without this a composition could carry `[label](javascript:...)`
 * to any GFM renderer. Three sink classes are covered:
 *
 * - **Inline links and images** — a blocked link degrades to its label, a
 *   blocked image to its alt text, matching the React path's behavior.
 * - **Link reference definitions** — the destination is rewritten to
 *   {@link BLOCKED_HREF} rather than correlating definitions to usages, so
 *   every usage form (`[text][ref]`, `[ref][]`, `[ref]`) becomes a dead link
 *   with its label intact. Two consequences worth knowing: a definition shared
 *   by an image usage yields a broken image rather than degrading to alt text,
 *   and CommonMark's "destination on the following line" form is not matched
 *   (it does not occur in generated output).
 * - **Raw HTML** — every tag-shaped construct is neutralized by escaping its
 *   `<`, rather than denylisting `<a>`/`<img>`/`<script>`, which would leave
 *   the class open. Nothing in the primitive catalog emits raw HTML in a
 *   markdown body, and agent-authored prose has no reason to.
 *
 * Code spans and fenced blocks are exempt: rewriting there would mangle inert
 * sample text.
 */
export const sanitizeMarkdownSource = (markdown: string): string =>
  markdown
    .split(CODE_SEGMENT_RE)
    .map((segment, index) =>
      // Odd indices are the captured code delimiters — passed through verbatim.
      index % 2 === 1 ? segment : sanitizeMarkdownSegment(segment)
    )
    .join('');

const sanitizeMarkdownSegment = (segment: string): string =>
  segment
    .replace(
      INLINE_LINK_RE,
      (
        _match,
        bang: string,
        label: string,
        angleDest: string | undefined,
        bareDest: string | undefined,
        title: string | undefined
      ) => {
        const target = unwrapDestination(angleDest ?? bareDest ?? '');
        const safe = bang
          ? sanitizeAssetUrl(target)
          : sanitizeNavigationHref(target);
        // Re-emit from the sanitized destination so the normalized form (not
        // the authored one) is what reaches the consumer.
        return safe
          ? `${bang}[${label}](${safe}${title ? ` ${title}` : ''})`
          : label;
      }
    )
    .replace(AUTOLINK_RE, (match, target: string) =>
      sanitizeNavigationHref(target) ? match : target
    )
    .replace(
      REFERENCE_DEF_RE,
      (_match, prefix: string, dest: string, title: string | undefined) => {
        const safe = sanitizeNavigationHref(unwrapDestination(dest));
        return `${prefix}${safe ?? BLOCKED_HREF}${title ?? ''}`;
      }
    )
    .replace(RAW_HTML_START_RE, '&lt;');

/**
 * Bolds a leading `Label:` prefix, leaving the rest of the line untouched.
 *
 * Lets a primitive whose text renderer already emits `Label: summary` reuse
 * that line on the markdown surface and still scan alongside bolder
 * neighbours. A no-op when `label` is absent or the text does not lead with it.
 */
export const boldLabelPrefix = (
  text: string,
  label: string | undefined
): string => {
  if (!label) {
    return text;
  }
  return text.startsWith(`${label}:`)
    ? `**${label}**${text.slice(label.length)}`
    : text;
};

/**
 * Bolds and uppercases a section label so it reads as a heading-equivalent atop
 * list-shaped markdown blocks (stat groups, description lists, badge groups).
 */
export const boldSectionLabel = (label: string): string =>
  `**${label.toUpperCase()}**`;

/**
 * A markdown renderer for a primitive whose text output is already valid GFM.
 *
 * Pass `options.label` to lift the node's label into bold via
 * {@link boldLabelPrefix}.
 */
export const defaultMarkdownFromText =
  <TNode>(
    renderText: (node: TNode) => string,
    options: {
      label?: (node: TNode) => string | undefined;
    } = {}
  ): ((node: TNode) => string) =>
  (node) => {
    const text = renderText(node);
    return options.label ? boldLabelPrefix(text, options.label(node)) : text;
  };
