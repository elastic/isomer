/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { ZodType } from 'zod';

import {
  renderMarkdownChildren,
  renderSlackChildren,
  renderTextChildren,
  slackCaption,
} from '../../render';
import { contentNode, definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { buildSchema, schema } from './schema';
import { windowTitle } from './title';
import type { SlideWindowNode } from './types';

export type { SlideWindowNode } from './types';

/** Catalog, schema, and renderers for {@link SlideWindowNode}. */
export const slideWindowPrimitive = definePrimitive<SlideWindowNode>({
  type: 'slideWindow',
  catalog,
  icon,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    buildSchema(contentNode(bodyNodeSchema)),
  renderers: {
    react,
    text: (node, { scope }) =>
      [windowTitle(node), renderTextChildren(node.body, scope)]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) => [
      md.paragraph(md.strong(windowTitle(node))),
      renderMarkdownChildren(node.body, scope),
    ],
    slack: (node, { collector, scope }) => [
      slackCaption(windowTitle(node), true),
      ...renderSlackChildren(node.body, scope, collector),
    ],
  },
  children: ({ body }) =>
    body.map((node, index) => ({ node, path: `body[${index}]` })),
  hasOwnContent: () => true,
});
