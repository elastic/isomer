/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { markdownText, marksMarkdown } from '../../render/markdown';
import { plainText } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideDefinitionsNode } from './schema';

export type { SlideDefinition, SlideDefinitionsNode } from './schema';

/** Text renderer for {@link SlideDefinitionsNode}: one `term: body` line each. */
export const text = ({ items }: SlideDefinitionsNode): string =>
  items
    .map(({ term, body }) => `${oneLine(term)}: ${plainText(body)}`)
    .join('\n');

/** Markdown renderer for {@link SlideDefinitionsNode}: a bullet per term. */
export const markdown = ({ items }: SlideDefinitionsNode): string =>
  items
    .map(
      ({ term, body }) => `- **${markdownText(term)}**: ${marksMarkdown(body)}`
    )
    .join('\n');

/** Catalog, schema, and renderers for {@link SlideDefinitionsNode}. */
export const slideDefinitionsPrimitive = definePrimitive({
  type: 'slideDefinitions',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
