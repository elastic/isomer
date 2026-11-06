/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { nodeAnchor } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';

import { unsupportedCatalog } from '../schema/catalog';
import { unsupportedExamples } from '../schema/examples/unsupported';
import { unsupportedSchema } from '../schema/unsupported';

import { definePrimitive } from './define';
import { unsupportedIcon } from './icons';
import { CHARTS_THEME } from './theme';

const { padding, borderWidth, height } = CHARTS_THEME.unsupported;

/** A visible placeholder: title, reason, and a link where there is one. */
export const unsupportedPrimitive = definePrimitive({
  type: 'unsupported',
  icon: unsupportedIcon,
  schema: unsupportedSchema,
  catalog: unsupportedCatalog,
  examples: unsupportedExamples,
  metrics: { snapshotHeight: () => height },
  renderers: {
    react: (node, { context }) => (
      <div
        {...nodeAnchor(context, node)}
        role="note"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: padding / 2,
          padding,
          border: `${borderWidth}px dashed currentColor`,
        }}>
        <strong style={{ fontSize: CHARTS_THEME.type.title }}>
          {node.title}
        </strong>
        <span style={{ fontSize: CHARTS_THEME.type.body }}>{node.reason}</span>
        {node.link && (
          <a href={node.link.href} style={{ fontSize: CHARTS_THEME.type.body }}>
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
