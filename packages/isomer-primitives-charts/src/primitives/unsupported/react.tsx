/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeAnchor, sanitizeNavigationHref } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { definePrimitive } from '../../render/define';
import { unsupportedIcon } from '../../render/icons';
import { cls } from '../../render/styles';
import { CHARTS_THEME } from '../../render/theme';

import { unsupportedCatalog } from './catalog';
import { unsupportedExamples } from './examples';
import { unsupportedSchema } from './schema';
import { unsupportedModule } from './styles';

const { height } = CHARTS_THEME.unsupported;
const { handles: note } = unsupportedModule;

/** A visible placeholder: title, reason, and a link where there is one. */
export const unsupportedPrimitive = definePrimitive({
  type: 'unsupported',
  icon: unsupportedIcon,
  schema: unsupportedSchema,
  catalog: unsupportedCatalog,
  examples: unsupportedExamples,
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
    react: (node, { context }) => (
      <div
        {...nodeAnchor(context, node)}
        role="note"
        className={cls(context, note.root)}>
        <strong className={cls(context, note.title)}>{node.title}</strong>
        <span className={cls(context, note.body)}>{node.reason}</span>
        {node.link && (
          <a href={node.link.href} className={cls(context, note.body)}>
            {node.link.label}
          </a>
        )}
      </div>
    ),
    text: (node) =>
      [
        `${node.title}: ${node.reason}`,
        ...(node.link ? [`${node.link.label}: ${node.link.href}`] : []),
      ].join('\n'),
    markdown: (node) => [
      md.paragraph(md.strong(node.title), ': ', node.reason),
      ...(node.link
        ? [md.paragraph(md.link(node.link.label, node.link.href))]
        : []),
    ],
  },
});
