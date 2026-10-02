/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { LogoMark } from '../../render/logo';
import { marksReact } from '../../render/marks';
import { title as theme, titleShares } from '../../theme/components/title';
import { slideLayout, withLayout } from '../layout';
import { sizeForLines, trackWidth } from '../size';

import { titleModule } from './styles';
import type { SlideTitleNode } from './types';

/** React renderer for {@link SlideTitleNode}. */
export const react = (
  { type, eyebrow, title, tagline, definition, aside, size }: SlideTitleNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: styles } = titleModule;
  const { width, height } = slideLayout(context);
  const column = (index: 0 | 1) =>
    trackWidth(width, titleShares, theme.columnGap, index);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, styles.root, aside ? undefined : styles.single)}>
      <div className={cls(context, styles.lead)}>
        {context?.logo === false ? null : (
          <LogoMark className={cls(context, styles.logo)} />
        )}
        {eyebrow ? (
          <p className={cls(context, styles.eyebrow)}>{eyebrow}</p>
        ) : null}
        <h1
          className={cls(
            context,
            styles.title,
            styles.titleSize[
              sizeForLines(
                size,
                title,
                theme.display.tracking,
                aside ? column(0) : width,
                theme.displaySizes
              )
            ]
          )}>
          {title}
        </h1>
        {tagline ? (
          <p className={cls(context, styles.tagline)}>
            {marksReact(tagline, context, 'primary')}
          </p>
        ) : null}
        {definition ? (
          <p className={cls(context, styles.definition)}>
            <dfn className={cls(context, styles.term)}>{definition.term}</dfn>
            <span className={cls(context, styles.definitionText)}>
              {marksReact(definition.text, context)}
            </span>
          </p>
        ) : null}
      </div>
      {aside ? (
        <div className={cls(context, styles.aside)}>
          {scope.renderReact(
            aside,
            withLayout(context, { width: column(1), height })
          )}
        </div>
      ) : null}
    </div>
  );
};
