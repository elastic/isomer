/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor, sanitizeNavigationHref } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact } from '../../render/marks';
import {
  closing as theme,
  closingShares,
} from '../../theme/components/closing';
import { frameContentWidth } from '../../theme/components/frame';
import { labelModule } from '../../theme/modules';
import { sizeForLines, trackWidth } from '../size';

import type { SlideClosingNode } from './schema';
import { closingModule } from './styles';

/** React renderer for {@link SlideClosingNode}. */
export const react = (
  { type, title, links, paths = [], size }: SlideClosingNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: closing } = closingModule;
  const step = sizeForLines(
    size,
    title,
    theme.title.tracking,
    paths.length > 0
      ? trackWidth(
          context?.width ?? frameContentWidth,
          closingShares,
          theme.columnGap
        )
      : (context?.width ?? frameContentWidth),
    theme.titleSizes
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(
        context,
        closing.root,
        paths.length === 0 ? closing.single : undefined
      )}>
      <div className={cls(context, closing.lead)}>
        <h1 className={cls(context, closing.title, closing.titleSize[step])}>
          {title}
        </h1>
        <ul className={cls(context, closing.links)}>
          {links.map(({ label, href: authored, text }, index) => {
            const href = authored ? sanitizeNavigationHref(authored) : null;
            return (
              <li key={index} className={cls(context, closing.linkItem)}>
                <span className={cls(context, labelModule.handles.label)}>
                  {label}
                </span>{' '}
                {href ? (
                  <a className={cls(context, closing.link)} href={href}>
                    {text}
                  </a>
                ) : (
                  <span className={cls(context, closing.link)}>{text}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {paths.length > 0 ? (
        <ul className={cls(context, closing.paths)}>
          {paths.map(({ title: goal, body }, index) => (
            <li key={index} className={cls(context, closing.path)}>
              <p className={cls(context, closing.pathTitle)}>{goal}</p>
              <p className={cls(context, closing.pathBody)}>
                {marksReact(body, context)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
