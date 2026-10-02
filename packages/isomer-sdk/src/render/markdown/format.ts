/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Shared helpers for a pack's markdown renderers. The markdown surface targets
// rich text clients rather than a narrow host, so it does not share the text
// surface's measuring and wrapping.

import type { Nodes, Parents } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';

import {
  BLOCKED_HREF,
  sanitizeAssetUrl,
  sanitizeNavigationHref,
  sanitizeParsedAssetUrl,
  sanitizeParsedNavigationHref,
} from '../../validate/url';

// Escapes label characters that could close a `[...]` early and smuggle in a
// hostile destination of their own.
const escapeLinkLabel = (label: string): string =>
  label.replace(/[[\]\\]/g, '\\$&');

// Percent-encodes destination characters that would terminate the `(...)`
// early or read as a link title. `encodeURIComponent` leaves `(` and `)`
// unescaped by spec, so those two are mapped by hand.
const escapeLinkDestination = (href: string): string =>
  href.replace(/[()\s\\]/g, (char) => {
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

const escapeParsedDestination = (href: string): string =>
  escapeLinkDestination(href.replace(/&/g, '&amp;'));

let parseOptions: Parameters<typeof fromMarkdown>[1] | undefined;

// Each pass can expose a new sink (an escaped HTML block reveals the Markdown
// inside it; a blocked link's label may close an outer `](`), so passes repeat
// until the source is stable.
const MAX_PASSES = 16;

const escapeTitle = (title: string): string =>
  `"${title.replace(/["\\]/g, '\\$&')}"`;

const offsets = (node: Nodes): [number, number] | undefined => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? undefined : [start, end];
};

const sanitizePass = (source: string): string => {
  const slice = (node: Nodes): string => {
    const range = offsets(node);
    return range ? source.slice(...range) : '';
  };

  const emitChildren = (
    start: number,
    end: number,
    children: readonly Nodes[]
  ): string => {
    let out = '';
    let cursor = start;
    for (const child of children) {
      const range = offsets(child);
      if (!range) continue;
      out += source.slice(cursor, range[0]) + emit(child);
      cursor = range[1];
    }
    return out + source.slice(cursor, end);
  };

  const emitLabel = (node: Parents): string => {
    const first = node.children[0];
    const last = node.children[node.children.length - 1];
    const from = first && offsets(first);
    const to = last && offsets(last);
    return from && to ? emitChildren(from[0], to[1], node.children) : '';
  };

  const rewrite = (node: Nodes): string | undefined => {
    switch (node.type) {
      case 'html':
        return slice(node).replace(/</g, '&lt;');
      case 'definition': {
        const safe = sanitizeParsedNavigationHref(node.url);
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `[${node.label ?? node.identifier}]: ${
          safe === null ? BLOCKED_HREF : escapeParsedDestination(safe)
        }${title}`;
      }
      case 'image': {
        const safe = sanitizeParsedAssetUrl(node.url);
        if (safe === null) return escapeLinkLabel(node.alt ?? '');
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `![${escapeLinkLabel(node.alt ?? '')}](${escapeParsedDestination(
          safe
        )}${title})`;
      }
      case 'link': {
        const raw = slice(node);
        const safe = sanitizeParsedNavigationHref(node.url);
        if (raw.startsWith('<')) {
          return safe === null ? raw.slice(1, -1) : undefined;
        }
        // A GFM literal (`www.x.com`) is http(s) or mailto by construction.
        if (!raw.startsWith('[')) return undefined;
        if (safe === null) return emitLabel(node);
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `[${emitLabel(node)}](${escapeParsedDestination(safe)}${title})`;
      }
      default:
        return undefined;
    }
  };

  const emit = (node: Nodes): string => {
    const replaced = rewrite(node);
    if (replaced !== undefined) return replaced;
    const range = offsets(node);
    if (!range) return '';
    return 'children' in node
      ? emitChildren(range[0], range[1], node.children)
      : source.slice(...range);
  };

  parseOptions ??= {
    extensions: [gfm()],
    mdastExtensions: [gfmFromMarkdown()],
  };
  const root = fromMarkdown(source, parseOptions);
  return emitChildren(0, source.length, root.children);
};

/** Sanitizes GFM destinations and HTML; excessive nesting degrades to inert text. */
export const sanitizeMarkdownSource = (markdown: string): string => {
  if (nestsTooDeeply(markdown)) return inert(markdown);
  let current = markdown;
  try {
    for (let pass = 0; pass < MAX_PASSES; pass++) {
      const next = sanitizePass(current);
      if (next === current) return current;
      current = next;
    }
  } catch (error) {
    // The parser recurses per nesting level, so inline nesting deep enough
    // to exhaust the stack lands here.
    if (!(error instanceof RangeError)) throw error;
  }
  return inert(current);
};

// No link, image, definition, or tag can survive without `[` or `<`.
const inert = (markdown: string): string =>
  markdown.replace(/[[\]\\]/g, '\\$&').replace(/</g, '&lt;');

// The parser's cost grows faster than linearly in nesting, both of block
// containers (indentation, `>`, and list markers opening a line) and of
// emphasis and links, so source past either bound is not parsed.
const LINE_PREFIX_RE = /^(?:[ \t>]|[-*+](?=[ \t])|\d{1,9}[.)](?=[ \t]))+/gm;
const MAX_LINE_PREFIX = 256;
// An intraword `_` cannot open or close emphasis, so it is not counted.
const INLINE_DELIMITER_RE = /[*[]|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu;
const MAX_INLINE_DELIMITERS = 2048;

const nestsTooDeeply = (markdown: string): boolean => {
  for (const [prefix] of markdown.matchAll(LINE_PREFIX_RE)) {
    if (prefix.length > MAX_LINE_PREFIX) return true;
  }
  let delimiters = 0;
  for (const _ of markdown.matchAll(INLINE_DELIMITER_RE)) {
    if (++delimiters > MAX_INLINE_DELIMITERS) return true;
  }
  return false;
};
