/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideTranscriptNode } from './schema';

export type { SlideTranscriptNode, SlideTranscriptTurn } from './schema';

const { roleLabel } = slideDistillery.tokens.transcript;

/** Text renderer for {@link SlideTranscriptNode}. */
export const text = (node: SlideTranscriptNode): string =>
  [
    node.label ?? '',
    ...node.turns.map(({ role, text: said }) =>
      said.includes('\n')
        ? `${roleLabel[role].value}:\n${said}`
        : `${roleLabel[role].value}: ${said}`
    ),
  ]
    .filter(Boolean)
    .join('\n');

const fenceFor = (code: string): string =>
  '`'.repeat(
    Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length)) + 1
  );

/** Markdown renderer for {@link SlideTranscriptNode}. */
export const markdown = (node: SlideTranscriptNode): string =>
  [
    node.label ? `### ${node.label}` : '',
    ...node.turns.map(({ format, role, text: said }) => {
      const speaker = `**${roleLabel[role].value}**`;
      if (format === 'code') {
        const fence = fenceFor(said);
        return `${speaker}\n\n${fence}text\n${said}\n${fence}`;
      }
      return `${speaker}\n\n${said}`;
    }),
  ]
    .filter(Boolean)
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideTranscriptNode}. */
export const slideTranscriptPrimitive = definePrimitive({
  type: 'slideTranscript',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
