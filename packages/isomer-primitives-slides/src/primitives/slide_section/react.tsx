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
import { marksReact } from '../../render/marks';
import {
  section as theme,
  sectionShares,
} from '../../theme/components/section';
import { slideLayout } from '../layout';
import { sizeForLines, trackWidth } from '../size';

import { lineHref } from './href';
import { ordinal } from './ordinal';
import type { SlideSectionNode } from './schema';
import { sectionModule } from './styles';

/** React renderer for {@link SlideSectionNode}. */
export const react = (
  { type, number, title, contents, hrefs, size }: SlideSectionNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: section } = sectionModule;
  const step = sizeForLines(
    size,
    title,
    theme.title.tracking,
    trackWidth(slideLayout(context).width, sectionShares, theme.columnGap),
    theme.titleSizes
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, section.root)}>
      <h1 className={cls(context, section.heading)}>
        <span className={cls(context, section.number)}>{number}</span>{' '}
        <span className={cls(context, section.title, section.titleSize[step])}>
          {title}
        </span>
      </h1>
      <ol className={cls(context, section.contents)}>
        {contents.map((line, index) => {
          const href = lineHref(hrefs, index);
          return (
            <li key={index} className={cls(context, section.row)}>
              <span aria-hidden>{ordinal(index)}</span>
              {href ? (
                <a className={cls(context, section.link)} href={href}>
                  {marksReact(line, context)}
                </a>
              ) : (
                <span>{marksReact(line, context)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
