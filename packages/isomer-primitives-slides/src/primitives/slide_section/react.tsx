/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { columnWidth } from '../../theme/components/frame';
import {
  section as theme,
  sectionShares,
} from '../../theme/components/section';
import { emWidth, longestWord, sizeForWidth } from '../size';

import type { SlideSectionNode } from './schema';
import { sectionModule } from './styles';

/** React renderer for {@link SlideSectionNode}. */
export const react = (
  { number, title, contents, hrefs, size }: SlideSectionNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: section } = sectionModule;
  return (
    <div className={cls(context, section.root)}>
      <h2 className={cls(context, section.heading)}>
        <span className={cls(context, section.number)}>{number}</span>
        <span
          className={cls(
            context,
            section.title,
            section.titleSize[
              sizeForWidth(
                size,
                emWidth(longestWord(title), theme.title.tracking),
                columnWidth(sectionShares, theme.columnGap),
                theme.titleSizes
              )
            ]
          )}>
          {title}
        </span>
      </h2>
      <ol className={cls(context, section.contents)}>
        {contents.map((line, index) => {
          const href = hrefs?.[index];
          return (
            <li key={index} className={cls(context, section.row)}>
              {href ? (
                <a className={cls(context, section.link)} href={href}>
                  {line}
                </a>
              ) : (
                line
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
