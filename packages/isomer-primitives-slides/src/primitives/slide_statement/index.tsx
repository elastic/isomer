/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import { type SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackHeading } from '../../render';
import {
  marksMarkdown,
  marksRichText,
  plainText,
  stripMarks,
} from '../../render/marks';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideStatementNode } from './schema';

export type { SlideStatementNode } from './schema';

export const text = ({ text: statement }: SlideStatementNode): string =>
  plainText(statement).toUpperCase();

export const markdown = ({ text: statement }: SlideStatementNode) => [
  md.heading(1, ...marksMarkdown(statement)),
];

export const slack = ({
  text: statement,
}: SlideStatementNode): SlackBlock[] => [
  slackHeading(stripMarks(statement), marksRichText(statement)),
];

/** Catalog, schema, and renderers for {@link SlideStatementNode}. */
export const slideStatementPrimitive = definePrimitive({
  type: 'slideStatement',
  catalog,
  icon,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
