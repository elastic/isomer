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
import { agendaFit } from '../../theme/components/agenda';
import { slideDistillery } from '../../theme/distillery';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideAgendaNode } from './schema';
import { agendaModule } from './styles';

const { here } = slideDistillery.tokens.agenda;

/** React renderer for {@link SlideAgendaNode}. */
export const react = (
  { type, sections, size }: SlideAgendaNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: agenda } = agendaModule;
  const { handles: label } = labelModule;
  const step = sizeForLoad(size, sections.length, agendaFit, context?.crowding);
  const currentIndex = sections.findIndex(({ current }) => current);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ol className={cls(context, agenda.list)}>
        {sections.map(({ number, title, count, current }, index) => (
          <li
            key={index}
            aria-current={current ? 'step' : undefined}
            className={cls(
              context,
              agenda.row,
              agenda.rowSize[step],
              current
                ? agenda.current
                : index < currentIndex
                  ? agenda.past
                  : agenda.upcoming
            )}>
            <span
              className={cls(context, agenda.number, agenda.numberSize[step])}>
              {number}
            </span>{' '}
            <span
              className={cls(context, agenda.title, agenda.titleSize[step])}>
              {title}
            </span>{' '}
            {current ? (
              <span
                className={cls(
                  context,
                  label.label,
                  label.toned,
                  tonesModule.handles.tone.primary
                )}>
                {here.value}
              </span>
            ) : count ? (
              <span className={cls(context, agenda.count)}>{count}</span>
            ) : (
              <span />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
};
