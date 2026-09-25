/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { LogoMark } from '../../render/logo';
import { columnWidth, frameContentWidth } from '../../theme/components/frame';
import { title as theme, titleShares } from '../../theme/components/title';
import { emWidth, longestWord, sizeForWidth } from '../size';

import { titleModule } from './styles';
import type { SlideTitleNode } from './types';

/** React renderer for {@link SlideTitleNode}. */
export const react = (
  { eyebrow, title, tagline, definition, aside, size }: SlideTitleNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: styles } = titleModule;
  return (
    <div
      className={cls(context, styles.root, aside ? undefined : styles.single)}>
      <div className={cls(context, styles.lead)}>
        <LogoMark className={cls(context, styles.logo)} />
        {eyebrow ? (
          <p className={cls(context, styles.eyebrow)}>{eyebrow}</p>
        ) : null}
        <h1
          className={cls(
            context,
            styles.title,
            styles.titleSize[
              sizeForWidth(
                size,
                emWidth(longestWord(title), theme.display.tracking),
                aside
                  ? columnWidth(titleShares, theme.columnGap)
                  : frameContentWidth,
                theme.displaySizes
              )
            ]
          )}>
          {title}
        </h1>
        {tagline ? (
          <p className={cls(context, styles.tagline)}>{tagline}</p>
        ) : null}
        {definition ? (
          <p className={cls(context, styles.definition)}>
            <dfn className={cls(context, styles.term)}>{definition.term}</dfn>
            <span className={cls(context, styles.definitionText)}>
              {definition.text}
            </span>
          </p>
        ) : null}
      </div>
      {aside ? (
        <div className={cls(context, styles.aside)}>
          {scope.renderReact(aside, context)}
        </div>
      ) : null}
    </div>
  );
};
