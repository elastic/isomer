/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, tonesModule } from '../../theme/modules';

import type { SlideLanesNode } from './schema';
import { lanesModule } from './styles';

const { label: connectorLabel } = slideDistillery.tokens.connector;
const { mergeJoiner } = slideDistillery.tokens.lanes;

/** React renderer for {@link SlideLanesNode}. */
export const react = (
  { type, lanes, join, notes = [] }: SlideLanesNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: style } = lanesModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, style.grid)}>
        {lanes.map(({ label, steps, tone }, index) => {
          const toned = tone ? tonesModule.handles.tone[tone] : undefined;
          return (
            <Fragment key={index}>
              <span
                className={cls(
                  context,
                  style.label,
                  toned,
                  tone && style.tonedLabel
                )}>
                <ToneCue {...{ tone, context }} />
                {label}
              </span>
              <ol className={cls(context, style.steps, toned)}>
                {steps.map((step, stepIndex) => (
                  <li key={stepIndex} className={cls(context, style.step)}>
                    <span
                      className={cls(
                        context,
                        style.chip,
                        tone && style.tonedChip
                      )}>
                      {step}
                    </span>
                    <span
                      aria-hidden
                      className={cls(
                        context,
                        style.line,
                        tone && style.tonedLine
                      )}
                    />
                  </li>
                ))}
              </ol>
            </Fragment>
          );
        })}
        <div
          role="img"
          aria-label={`${lanes.map(({ label }) => label).join(` ${mergeJoiner.value} `)} ${connectorLabel.value} ${join}`}
          className={cls(context, style.merge)}>
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
              <dd className={cls(context, style.noteBody)}>
                {marksReact(body, context)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
};
