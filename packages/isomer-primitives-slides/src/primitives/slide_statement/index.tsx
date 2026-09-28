/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatHeaderText, type SlackBlock } from '@elastic/isomer-sdk/slack';

import { marksMarkdown } from '../../render/markdown';
import { plainText, stripMarks } from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideStatementNode } from './schema';

export type { SlideStatementNode } from './schema';

/** Text renderer for {@link SlideStatementNode}. */
export const text = ({ text: statement }: SlideStatementNode): string =>
  plainText(statement);

/** Markdown renderer for {@link SlideStatementNode}: the slide's claim, as its heading. */
export const markdown = ({ text: statement }: SlideStatementNode): string =>
  `# ${marksMarkdown(statement)}`;

/** Slack renderer for {@link SlideStatementNode}: a header, as a heading's claim would be. */
export const slack = ({
  text: statement,
}: SlideStatementNode): SlackBlock[] => [
  {
    type: 'header',
    text: {
      type: 'plain_text',
      text: formatHeaderText(stripMarks(statement)),
      emoji: true,
    },
  },
];

/** Catalog, schema, and renderers for {@link SlideStatementNode}. */
export const slideStatementPrimitive = definePrimitive({
  type: 'slideStatement',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
