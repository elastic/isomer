/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import {
  marksMarkdown,
  marksRichText,
  plainText,
  richTextRun as run,
} from '../../render/marks';
import { toneCueText } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLayersNode } from './schema';

export type { SlideLayer, SlideLayersNode } from './schema';

const dash = ` ${slideDistillery.tokens.layers.dash.value} `;
const separator = ` ${slideDistillery.tokens.layers.separator.value} `;

export const text = ({ layers }: SlideLayersNode): string =>
  layers
    .map(
      ({ name, body, chips, owner, tone }) =>
        `${oneLine(name)}${dash}${chips ? chips.map(oneLine).join(', ') : plainText(body ?? '')}${separator}${toneCueText(tone)}${oneLine(owner)}`
    )
    .join('\n');

export const markdown = ({ layers }: SlideLayersNode) =>
  md.list(
    layers.map(({ name, body, chips, owner, tone }) =>
      md.paragraph(
        md.strong(name),
        dash,
        ...(chips
          ? chips.flatMap((chip, index) => [
              ...(index > 0 ? [', '] : []),
              md.code(oneLine(chip)),
            ])
          : marksMarkdown(body ?? '')),
        separator,
        toneCueText(tone),
        md.emphasis(owner)
      )
    ),
    { ordered: true }
  );

export const slack = ({ layers }: SlideLayersNode): SlackBlock[] => [
  {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_list',
        style: 'ordered',
        elements: layers.map(({ name, body, chips, owner, tone }) => ({
          type: 'rich_text_section',
          elements: [
            run(name, { bold: true }),
            run(dash),
            ...(chips
              ? chips.flatMap((chip, index) => [
                  ...(index > 0 ? [run(', ')] : []),
                  run(chip, { code: true }),
                ])
              : marksRichText(body ?? '')),
            run(separator),
            ...(tone ? [run(toneCueText(tone))] : []),
            run(owner, { italic: true }),
          ],
        })),
      },
    ],
  },
];

/** Catalog, schema, and renderers for {@link SlideLayersNode}. */
export const slideLayersPrimitive = definePrimitive({
  type: 'slideLayers',
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
