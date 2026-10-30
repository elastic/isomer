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
import { slideLayout } from '../layout';

import { sectionStep } from './fit';
import { lineHref } from './href';
import { ordinal } from './ordinal';
import type { SectionSlideNode } from './schema';
import { sectionModule } from './styles';

/** React renderer for {@link SectionSlideNode}. */
export const react = (
  node: SectionSlideNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: section } = sectionModule;
  const { type, number, title, slides } = node;
  const step = sectionStep(node, slideLayout(context));
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
        {slides.map((slide, index) => {
          const href = lineHref(slide.href);
          return (
            <li key={index} className={cls(context, section.row)}>
              <span aria-hidden>{ordinal(index)}</span>
              {href ? (
                <a className={cls(context, section.link)} href={href}>
                  {marksReact(slide.text, context)}
                </a>
              ) : (
                <span>{marksReact(slide.text, context)}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};
