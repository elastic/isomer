/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { layoutModule } from '../../theme/modules';

import type { SlideLanesNode } from './schema';
import { lanesModule } from './styles';

/** React renderer for {@link SlideLanesNode}. */
export const react = (
  { lanes, join, notes = [] }: SlideLanesNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: style } = lanesModule;
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, style.grid)}>
        {lanes.map(({ label, steps }, index) => (
          <Fragment key={index}>
            <span className={cls(context, style.label)}>{label}</span>
            <ol className={cls(context, style.steps)}>
              {steps.map((step, stepIndex) => (
                <li key={stepIndex} className={cls(context, style.step)}>
                  <span className={cls(context, style.chip)}>{step}</span>
                  <span aria-hidden className={cls(context, style.line)} />
                </li>
              ))}
            </ol>
          </Fragment>
        ))}
        <div aria-hidden className={cls(context, style.merge)}>
          <span className={cls(context, style.bracket)} />
          <span className={cls(context, style.stub)} />
        </div>
        <span className={cls(context, style.join)}>{join}</span>
      </div>
      {notes.length > 0 ? (
        <dl className={cls(context, style.notes)}>
          {notes.map(({ title, body }, index) => (
            <div key={index} className={cls(context, style.note)}>
              <dt className={cls(context, style.noteTitle)}>{title}</dt>
              <dd className={cls(context, style.noteBody)}>{body}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
};
