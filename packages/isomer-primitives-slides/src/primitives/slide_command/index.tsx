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

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideCommandNode } from './schema';

export { SLIDE_COPY, slideCopyEnhancement } from './copy';
export type { SlideCommandNode } from './schema';

const prompt = slideDistillery.tokens.command.prompt.value;

export const text = ({ label, command }: SlideCommandNode): string =>
  [label && oneLine(label).toUpperCase(), `${prompt} ${command}`]
    .filter(Boolean)
    .join('\n');

/** A `sh` fence without the prompt, so it pastes. */
export const markdown = ({ label, command }: SlideCommandNode) => [
  ...(label ? [md.paragraph(md.strong(label.toUpperCase()))] : []),
  md.codeBlock(command, 'sh'),
];

export const slack = ({ label, command }: SlideCommandNode): SlackBlock[] => [
  slackCodePanel(command, label?.toUpperCase(), true),
];

export const slideCommandPrimitive = definePrimitive({
  type: 'slideCommand',
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
