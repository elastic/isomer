/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import { markdownText } from '../../render/markdown';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import {
  schema,
  type SlideAgendaNode,
  type SlideAgendaSection,
} from './schema';

export type { SlideAgendaNode, SlideAgendaSection } from './schema';

const { hereMark, separator } = slideDistillery.tokens.agenda;

const detail = ({ count, current }: SlideAgendaSection): string =>
  [
    count ? ` ${separator.value} ${count}` : '',
    current ? ` (${hereMark.value})` : '',
  ].join('');

/** Text renderer for {@link SlideAgendaNode}: one line per section. */
export const text = ({ sections }: SlideAgendaNode): string =>
  sections
    .map((section) =>
      oneLine(`${section.number} ${section.title}${detail(section)}`)
    )
    .join('\n');

/** Markdown renderer for {@link SlideAgendaNode}: one bullet per section, its number in bold. */
export const markdown = ({ sections }: SlideAgendaNode): string =>
  sections
    .map(
      (section) =>
        `- **${markdownText(section.number)}** ${markdownText(section.title)}${detail(
          {
            ...section,
            ...(section.count ? { count: markdownText(section.count) } : {}),
          }
        )}`
    )
    .join('\n');

/** Catalog, schema, and renderers for {@link SlideAgendaNode}. */
export const slideAgendaPrimitive = definePrimitive({
  type: 'slideAgenda',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
