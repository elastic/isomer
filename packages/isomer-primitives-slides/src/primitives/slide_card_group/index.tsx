/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideCard, type SlideCardGroupNode } from './schema';

export type { SlideCard, SlideCardGroupNode } from './schema';

/** Badge and label as the meta row shows them; empty when a card has neither. */
const cardMeta = ({ badge, label }: SlideCard): string =>
  [badge, label].filter(Boolean).join(' ');

const text = (node: SlideCardGroupNode) =>
  node.cards
    .map((card) =>
      [cardMeta(card), card.title, card.body].filter(Boolean).join('\n')
    )
    .join('\n\n');

const markdown = (node: SlideCardGroupNode) =>
  node.cards
    .map((card) => {
      const meta = cardMeta(card);
      return [`### ${card.title}`, meta ? `_${meta}_` : '', card.body]
        .filter(Boolean)
        .join('\n\n');
    })
    .join('\n\n');

/** Catalog, schema, and renderers for {@link SlideCardGroupNode}. */
export const slideCardGroupPrimitive = definePrimitive({
  type: 'slideCardGroup',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
