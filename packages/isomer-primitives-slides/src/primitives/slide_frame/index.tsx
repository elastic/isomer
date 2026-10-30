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
import { icon } from './icon';
import { react } from './react';
import { schema } from './schema';
import { frameModule } from './styles';
import type { SlideFrameNode } from './types';
import { displayFrameUrl, sanitizeFrameUrl } from './url';

export { SlideFrameView } from './react';
export type { SlideFooter, SlideFrameNode } from './types';

const separator = ` ${slideDistillery.tokens.frame.separator.value} `;

const footerParts = (footer: SlideFrameNode['footer']): string[] =>
  footer
    ? [
        footer.brand,
        [footer.sectionNumber, footer.section].filter(Boolean).join(' '),
      ].filter((part): part is string => Boolean(part))
    : [];

const footerText = (node: SlideFrameNode): string =>
  [
    ...footerParts(node.footer),
    ...(node.footer?.url ? [displayFrameUrl(node.footer.url)] : []),
  ]
    .map(oneLine)
    .join(separator);

const footerMarkdown = (node: SlideFrameNode) => {
  const url = node.footer?.url;
  const parts: MarkdownInlineInput[] = [
    ...footerParts(node.footer),
    ...(url ? [md.link(displayFrameUrl(url), url)] : []),
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
export const slideFramePrimitive = definePrimitive<
  SlideFrameNode,
  typeof schema
>({
  type: 'slideFrame',
  catalog,
  icon,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    schema.extend({ body: bodyNodes(bodyNodeSchema, schema.shape.body) }),
  styles: [frameModule],
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
    const authored = node.footer?.url;
    if (authored === undefined || !node.footer) {
      return node;
    }
    const url = sanitizeFrameUrl(authored);
    if (url) {
      return { ...node, footer: { ...node.footer, url } };
    }
    const { url: _dropped, ...footer } = node.footer;
    return { ...node, footer };
  },
  metrics: {
    snapshotHeight: () => scalePx(SLIDE_THEME.frame.height),
  },
});
