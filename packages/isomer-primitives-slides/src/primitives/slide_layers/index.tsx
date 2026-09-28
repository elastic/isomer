/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { oneLine } from '@elastic/isomer-sdk/author';

import {
  markdownCode,
  markdownText,
  marksMarkdown,
} from '../../render/markdown';
import { plainText } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideLayersNode } from './schema';

export type { SlideLayer, SlideLayersNode } from './schema';

const { dash, separator } = slideDistillery.tokens.layers;

/** Text renderer for {@link SlideLayersNode}: `Name — body (Owner)` per layer, top to bottom. */
export const text = ({ layers }: SlideLayersNode): string =>
  layers
    .map(
      ({ name, body, chips, owner }) =>
        `${oneLine(name)} ${dash.value} ${chips ? chips.map(oneLine).join(', ') : plainText(body ?? '')} (${oneLine(owner)})`
    )
    .join('\n');

/** Markdown renderer for {@link SlideLayersNode}: a numbered list, top to bottom. */
export const markdown = ({ layers }: SlideLayersNode): string =>
  layers
    .map(
      ({ name, body, chips, owner }, index) =>
        `${index + 1}. **${markdownText(name)}** ${dash.value} ${chips ? chips.map((chip) => markdownCode(chip)).join(', ') : marksMarkdown(body ?? '')} ${separator.value} _${markdownText(owner)}_`
    )
    .join('\n');

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
  },
});
