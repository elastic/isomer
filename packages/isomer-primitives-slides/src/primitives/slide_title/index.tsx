/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { markdownLink } from '@elastic/isomer-sdk/markdown';

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLedeLink, type SlideTitleNode } from './schema';

export type { SlideLedeLink, SlideLedePart, SlideTitleNode } from './schema';

const flattenLede = (
  lede: SlideTitleNode['lede'],
  link: (part: SlideLedeLink) => string
): string => {
  if (!lede) {
    return '';
  }
  if (typeof lede === 'string') {
    return lede;
  }
  return lede
    .map((part) => (typeof part === 'string' ? part : link(part)))
    .join('');
};

/** Text renderer for {@link SlideTitleNode}. */
export const text = (node: SlideTitleNode) =>
  [node.eyebrow, node.title, flattenLede(node.lede, ({ text: label }) => label)]
    .filter(Boolean)
    .join('\n');

/** Markdown renderer for {@link SlideTitleNode}. */
export const markdown = (node: SlideTitleNode) =>
  [
    node.eyebrow ? `_${node.eyebrow}_` : '',
    `## ${node.title}`,
    flattenLede(node.lede, ({ text: label, href }) =>
      markdownLink(label, href)
    ),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideTitleNode}. */
export const slideTitlePrimitive = definePrimitive({
  type: 'slideTitle',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
  sanitize: (node) => {
    if (!node.lede || typeof node.lede === 'string') {
      return node;
    }
    const lede = node.lede.map((part) => {
      if (typeof part === 'string') {
        return part;
      }
      const href = sanitizeNavigationHref(part.href);
      return href ? { ...part, href } : part.text;
    });
    return { ...node, lede };
  },
});
