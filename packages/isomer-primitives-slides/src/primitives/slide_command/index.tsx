/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  codeBlock,
  escapeMrkdwn,
  type SlackBlock,
} from '@elastic/isomer-sdk/slack';

import { fencedBlock } from '../../render/fence';
import { markdownText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideCommandNode } from './schema';

export { SLIDE_COPY, slideCopyEnhancement } from './copy';
export type { SlideCommandNode } from './schema';

const prompt = slideDistillery.tokens.command.prompt.value;

/** Text renderer for {@link SlideCommandNode}: the label, then the command after its prompt. */
export const text = ({ label, command }: SlideCommandNode): string =>
  [...(label ? [label] : []), `${prompt} ${command}`].join('\n');

/** Markdown renderer for {@link SlideCommandNode}: the label, then a `sh` fence without the prompt, so it pastes. */
export const markdown = ({ label, command }: SlideCommandNode): string =>
  [label ? `**${markdownText(label)}**` : '', fencedBlock(command, 'sh')]
    .filter(Boolean)
    .join('\n\n');

/** Slack renderer for {@link SlideCommandNode}: the label, then a code block. */
export const slack = ({ label, command }: SlideCommandNode): SlackBlock[] => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: [label ? escapeMrkdwn(label) : '', codeBlock(command)]
        .filter(Boolean)
        .join('\n'),
    },
  },
];

/** Catalog, schema, and renderers for {@link SlideCommandNode}. */
export const slideCommandPrimitive = definePrimitive({
  type: 'slideCommand',
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
