/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { markdownLink } from '@elastic/isomer-sdk/markdown';
import type { ZodType } from 'zod';

import {
  renderChildren,
  renderSlackChildren,
  slackCaption,
} from '../../render';
import { markdownText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { scalePx } from '../../theme/scale';
import { SLIDE_THEME } from '../../theme/theme';
import { bodyNodes, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema } from './schema';
import type { SlideFrameNode } from './types';
import { sanitizeFrameUrl } from './url';

export { SlideFrameView } from './react';
export type { SlideFrameNode } from './types';

const { separator } = slideDistillery.tokens.frame;

const displayUrl = (url: string): string => url.replace(/^https?:\/\//, '');

/** The footer as one line: brand, section, and address. */
const footerLine = (
  { brand, section, sectionNumber, url }: SlideFrameNode,
  formatUrl: (url: string) => string
): string =>
  [
    brand,
    [sectionNumber, section].filter(Boolean).join(' '),
    url ? formatUrl(url) : '',
  ]
    .filter(Boolean)
    .join(` ${separator.value} `);

/** Catalog, schema, and renderers for {@link SlideFrameNode}. */
export const slideFramePrimitive = definePrimitive<SlideFrameNode>({
  type: 'slideFrame',
  catalog,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({ body: bodyNodes(bodyNodeSchema, schema.shape.body) }),
  renderers: {
    react,
    text: (node, { scope }) =>
      [
        renderChildren(node.body, scope, 'text'),
        oneLine(footerLine(node, displayUrl)),
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) => {
      const { brand, section, sectionNumber } = node;
      const footer = footerLine(
        {
          ...node,
          ...(brand ? { brand: markdownText(brand) } : {}),
          ...(section ? { section: markdownText(section) } : {}),
          ...(sectionNumber
            ? { sectionNumber: markdownText(sectionNumber) }
            : {}),
        },
        (url) => markdownLink(displayUrl(url), url)
      );
      return [
        renderChildren(node.body, scope, 'markdown'),
        footer && `_${footer}_`,
      ]
        .filter(Boolean)
        .join('\n\n');
    },
    slack: (node, { collector, scope }) => {
      const footer = footerLine(node, displayUrl);
      return [
        ...renderSlackChildren(node.body, scope, collector),
        ...(footer ? [slackCaption(footer)] : []),
      ];
    },
  },
  children: (node) =>
    node.body.map((child, index) => ({
      node: child,
      path: `body[${index}]`,
    })),
  hasOwnContent: () => true,
  sanitize: (node) => {
    if (node.url === undefined) {
      return node;
    }
    const url = sanitizeFrameUrl(node.url);
    if (url) {
      return { ...node, url };
    }
    const { url: _dropped, ...rest } = node;
    return rest;
  },
  metrics: {
    svgHeight: () => scalePx(SLIDE_THEME.frame.height),
  },
});
