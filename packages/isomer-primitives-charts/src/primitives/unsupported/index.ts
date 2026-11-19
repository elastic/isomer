/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { CHARTS_THEME } from '../../theme';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type UnsupportedNode } from './schema';

export { catalog as unsupportedCatalog } from './catalog';
export { examples as unsupportedExamples } from './examples';
export { type UnsupportedNode, schema as unsupportedSchema } from './schema';

const { height } = CHARTS_THEME.unsupported;

const text = ({ title, reason, link }: UnsupportedNode): string =>
  [
    `${title}: ${reason}`,
    ...(link ? [`${link.label}: ${link.href}`] : []),
  ].join('\n');

const markdown = ({ title, reason, link }: UnsupportedNode) => [
  md.paragraph(md.strong(title), ': ', reason),
  ...(link ? [md.paragraph(md.link(link.label, link.href))] : []),
];

/** A visible placeholder: title, reason, and a link where there is one. */
export const unsupportedPrimitive = definePrimitive({
  type: 'unsupported',
  catalog,
  icon,
  examples,
  schema,
  metrics: { snapshotHeight: () => height },
  // An unsafe link is dropped; the note still draws.
  sanitize: (node) => {
    if (!node.link) {
      return node;
    }
    const { link, ...rest } = node;
    const href = sanitizeNavigationHref(link.href);
    return href === null ? rest : { ...rest, link: { ...link, href } };
  },
  renderers: {
    react,
    text,
    markdown,
  },
});
