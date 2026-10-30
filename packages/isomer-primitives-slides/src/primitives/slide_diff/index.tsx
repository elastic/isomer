/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { slackCodePanel } from '../../render';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';
import { withGutter } from '../line_gutter';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { diffGutter, diffLines, schema, type SlideDiffNode } from './schema';
import { diffModule } from './styles';

export type { SlideDiffLine, SlideDiffNode } from './schema';

const { marker } = slideDistillery.tokens.diff;

/** The lines in unified-diff form, each after its line number when `numbered` and the diff has them. */
const unified = (node: SlideDiffNode, numbered: boolean): string => {
  const gutter = numbered ? diffGutter(node) : undefined;
  return diffLines(node)
    .map(({ text, op }, index) =>
      withGutter(gutter?.[index], `${marker[op ?? 'context'].value}${text}`)
    )
    .join('\n');
};

export const text = (node: SlideDiffNode): string =>
  [...(node.file ? [oneLine(node.file)] : []), unified(node, true)].join('\n');

// The fence stays a unified diff, so its marker column comes first.
export const markdown = (node: SlideDiffNode) => [
  ...(node.file ? [md.paragraph(md.strong(node.file))] : []),
  md.codeBlock(unified(node, false), 'diff'),
];

export const slack = (node: SlideDiffNode): SlackBlock[] => [
  slackCodePanel(unified(node, true), node.file),
];

export const slideDiffPrimitive = definePrimitive({
  type: 'slideDiff',
  catalog,
  icon,
  examples,
  schema,
  styles: [diffModule],
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
