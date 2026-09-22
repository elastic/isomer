/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';
import { slideCardColumnsKey } from '../../theme/variants';

import type { SlideCardGroupNode } from './schema';

/** React renderer for {@link SlideCardGroupNode}. */
export const react = (
  node: SlideCardGroupNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: cards } = slideModules.cards;
  const { handles: tones } = slideModules.tones;
  const style = node.style ?? 'standard';
  const columns =
    node.columns === undefined
      ? undefined
      : cards.columns[slideCardColumnsKey(node.columns)];
  return (
    <div className={cls(context, cards.grid, cards.style[style], columns)}>
      {node.cards.map((card, index) => (
        <article
          className={cls(
            context,
            cards.card,
            cards.cardStyle[style],
            tones.tone[card.tone ?? 'primary']
          )}
          key={`${card.title}-${index}`}>
          {style === 'feature' && card.badge ? (
            <div className={cls(context, cards.hero)}>{card.badge}</div>
          ) : null}
          <div className={cls(context, cards.meta)}>
            {style !== 'feature' && card.badge ? (
              <span>{card.badge}</span>
            ) : null}
            {card.label ? <strong>{card.label}</strong> : null}
          </div>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
        </article>
      ))}
    </div>
  );
};
