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
  closing as theme,
  closingShares,
} from '../../theme/components/closing';
import { columnWidth } from '../../theme/components/frame';
import { labelModule } from '../../theme/modules';
import { sizeForLines } from '../size';

import type { SlideClosingNode } from './schema';
import { closingModule } from './styles';

/** React renderer for {@link SlideClosingNode}. */
export const react = (
  { type, title, links, paths = [], size }: SlideClosingNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: closing } = closingModule;
  const { handles: label } = labelModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(
        context,
        closing.root,
        paths.length === 0 ? closing.single : undefined
      )}>
      <div className={cls(context, closing.lead)}>
        <h2
          className={cls(
            context,
            closing.title,
            closing.titleSize[
              sizeForLines(
                size,
                title,
                theme.title.tracking,
                columnWidth(closingShares, theme.columnGap),
                theme.titleSizes
              )
            ]
          )}>
          {title}
        </h2>
        <ul className={cls(context, closing.links)}>
          {links.map(({ label: caption, href, text }, index) => (
            <li key={index} className={cls(context, closing.linkItem)}>
              <span className={cls(context, label.label)}>{caption}</span>
              {href ? (
                <a className={cls(context, closing.link)} href={href}>
                  {text}
                </a>
              ) : (
                <span className={cls(context, closing.link)}>{text}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
      {paths.length > 0 ? (
        <ul className={cls(context, closing.paths)}>
          {paths.map(({ title: pathTitle, body }, index) => (
            <li key={index} className={cls(context, closing.path)}>
              <h3 className={cls(context, closing.pathTitle)}>{pathTitle}</h3>
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
