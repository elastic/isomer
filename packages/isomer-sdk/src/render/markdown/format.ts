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
        const safe = sanitizeNavigationHref(node.url);
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `[${node.label ?? node.identifier}]: ${
          safe === null ? BLOCKED_HREF : escapeLinkDestination(safe)
        }${title}`;
      }
      case 'image': {
        const safe = sanitizeAssetUrl(node.url);
        if (safe === null) return escapeLinkLabel(node.alt ?? '');
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `![${escapeLinkLabel(node.alt ?? '')}](${escapeLinkDestination(
          safe
        )}${title})`;
      }
      case 'link': {
        const raw = slice(node);
        const safe = sanitizeNavigationHref(node.url);
        if (raw.startsWith('<')) {
          return safe === null ? raw.slice(1, -1) : undefined;
        }
        // A GFM literal (`www.x.com`) is http(s) or mailto by construction.
        if (!raw.startsWith('[')) return undefined;
        if (safe === null) return emitLabel(node);
        if (safe === node.url) return undefined;
        const title = node.title ? ` ${escapeTitle(node.title)}` : '';
        return `[${emitLabel(node)}](${escapeLinkDestination(safe)}${title})`;
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

/**
 * Rewrites unsafe destinations out of authored Markdown before it reaches a
 * Markdown consumer, leaving every other byte as authored. The source is
 * parsed as GFM, so a sink is found wherever a renderer would find one:
 *
 * - **Links and images** — a blocked link degrades to its label, a blocked
 *   image to its alt text, matching the React path.
 * - **Link reference definitions** — the destination becomes
 *   {@link BLOCKED_HREF}, so every usage of it is a dead link with its label.
 * - **Raw HTML** — every `<` in an HTML node is escaped, rather than
 *   denylisting tags.
 */
export const sanitizeMarkdownSource = (markdown: string): string => {
  let current = markdown;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const next = sanitizePass(current);
    if (next === current) return current;
    current = next;
  }
  // No link, image, definition, or tag can survive without `[` or `<`.
  return current.replace(/[[\]\\]/g, '\\$&').replace(/</g, '&lt;');
};
