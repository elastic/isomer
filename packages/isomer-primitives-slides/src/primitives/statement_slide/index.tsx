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
import { schema, type StatementSlideNode } from './schema';
import { statementModule } from './styles';

export type { StatementSlideNode } from './schema';

export const text = ({ text: statement }: StatementSlideNode): string =>
  plainText(statement).toUpperCase();

export const markdown = ({ text: statement }: StatementSlideNode) => [
  md.heading(1, ...marksMarkdown(statement)),
];

export const slack = ({
  text: statement,
}: StatementSlideNode): SlackBlock[] => [
  slackHeading(stripMarks(statement), marksRichText(statement)),
];

/** Catalog, schema, and renderers for {@link StatementSlideNode}. */
export const statementSlidePrimitive = definePrimitive({
  type: 'statementSlide',
  catalog,
  icon,
  examples,
  schema,
  styles: [statementModule],
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
