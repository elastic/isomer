/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type MarkdownInlineInput, md } from '@elastic/isomer-sdk/markdown';
import type { ZodType } from 'zod';

import {
  renderMarkdownChildren,
  renderSlackChildren,
  renderTextChildren,
  slackCaption,
} from '../../render';
import { oneLine } from '../../render/one_line';
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

const separator = ` ${slideDistillery.tokens.frame.separator.value} `;

const displayUrl = (url: string): string => url.replace(/^https?:\/\//, '');

const footerParts = ({
  brand,
  section,
  sectionNumber,
}: SlideFrameNode): string[] =>
  [brand, [sectionNumber, section].filter(Boolean).join(' ')].filter(
    (part): part is string => Boolean(part)
  );

const footerText = (node: SlideFrameNode): string =>
  [...footerParts(node), ...(node.url ? [displayUrl(node.url)] : [])]
    .map(oneLine)
    .join(separator);

const footerMarkdown = (node: SlideFrameNode) => {
  const parts: MarkdownInlineInput[] = [
    ...footerParts(node),
    ...(node.url ? [md.link(displayUrl(node.url), node.url)] : []),
  ];
  return parts.length === 0
    ? []
    : [
        md.paragraph(
          md.emphasis(
            ...parts.flatMap((part, index) =>
              index === 0 ? [part] : [separator, part]
            )
          )
        ),
      ];
};

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
      [renderTextChildren(node.body, scope), footerText(node)]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) => [
      renderMarkdownChildren(node.body, scope),
      ...footerMarkdown(node),
    ],
    slack: (node, { collector, scope }) => {
      const footer = footerText(node);
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
