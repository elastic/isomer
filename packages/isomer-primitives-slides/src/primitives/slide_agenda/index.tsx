/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { richTextRun } from '../../render/marks';
import { oneLine } from '../../render/one_line';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import {
  schema,
  type SlideAgendaNode,
  type SlideAgendaSection,
} from './schema';

export type { SlideAgendaNode, SlideAgendaSection } from './schema';

const { here, separator } = slideDistillery.tokens.agenda;

const detail = ({ count, current }: SlideAgendaSection): string => {
  const shown = current ? here.value.toUpperCase() : count;
  return shown ? oneLine(` ${separator.value} ${shown}`) : '';
};

export const text = ({ sections }: SlideAgendaNode): string =>
  sections
    .map((section) =>
      oneLine(`${section.number} ${section.title}${detail(section)}`)
    )
    .join('\n');

export const markdown = ({ sections }: SlideAgendaNode) => [
  md.list(
    sections.map((section) =>
      md.paragraph(
        md.strong(section.number),
        ` ${section.title}${detail(section)}`
      )
    )
  ),
];

export const slack = ({ sections }: SlideAgendaNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'bullet',
        elements: sections.map((section) => ({
          type: 'rich_text_section',
          elements: [
            richTextRun(section.number, { bold: true }),
            richTextRun(` ${section.title}${detail(section)}`),
          ],
        })),
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideAgendaNode}. */
export const slideAgendaPrimitive = definePrimitive({
  type: 'slideAgenda',
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
