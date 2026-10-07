/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { ZodType } from 'zod';

import { slackCaption } from '../../render';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import {
  embeddedMarkdown,
  embeddedSlack,
  embeddedText,
  headline,
} from './output';
import { react } from './react';
import { buildSchema, schema } from './schema';
import type { SlideRenderNode } from './types';

export type { SlideRenderNode } from './types';

/** Catalog, schema, and renderers for {@link SlideRenderNode}. */
export const slideRenderPrimitive = definePrimitive<SlideRenderNode>({
  type: 'slideRender',
  catalog,
  icon,
  examples,
  schema,
  schemaFor: (bodyNodeSchema: ZodType<unknown>) => buildSchema(bodyNodeSchema),
  renderers: {
    react,
    text: (node, { scope }) =>
      [
        headline(node),
        node.body && embeddedText(node.body, node.surface, scope),
      ]
        .filter(Boolean)
        .join('\n\n'),
    markdown: (node, { scope }) => [
      md.paragraph(md.emphasis(headline(node))),
      ...(node.body ? [embeddedMarkdown(node.body, node.surface, scope)] : []),
    ],
    slack: (node, { collector, scope }) => [
      slackCaption(headline(node)),
      ...(node.body
        ? embeddedSlack(node.body, node.surface, scope, collector)
        : []),
    ],
  },
});
