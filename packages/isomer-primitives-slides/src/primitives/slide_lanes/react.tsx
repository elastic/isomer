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
import { ToneCue } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule, tonesModule } from '../../theme/modules';

import { lanesStep } from './fit';
import type { SlideLanesNode } from './schema';
import { lanesModule } from './styles';

const { label: connectorLabel } = slideDistillery.tokens.connector;
const { mergeJoiner } = slideDistillery.tokens.lanes;

/** React renderer for {@link SlideLanesNode}. */
export const react = (
  node: SlideLanesNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, lanes, join, notes = [] } = node;
  const { handles: style } = lanesModule;
  const size = lanesStep(node, context);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, style.row)}>
        <div className={cls(context, style.lanes, style.lanesSize[size])}>
          {lanes.map(({ label, steps, tone }, index) => {
            const toned = tone ? tonesModule.handles.tone[tone] : undefined;
            return (
              <div
                key={index}
                className={cls(context, style.lane, style.laneSize[size])}>
                <span
                  className={cls(
                    context,
                    style.label,
                    style.labelSize[size],
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
                          style.chipSize[size],
                          tone && style.tonedChip
                        )}>
                        {step}
                      </span>
                      <span
                        aria-hidden
                        className={cls(
                          context,
                          style.line,
                          style.lineSize[size],
                          tone && style.tonedLine
                        )}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
        <div
          role="img"
          aria-label={`${lanes.map(({ label }) => label).join(` ${mergeJoiner.value} `)} ${connectorLabel.value} ${join}`}
          className={cls(context, style.merge, style.mergeSize[size])}>
          <span
            className={cls(context, style.bracket, style.bracketSize[size])}
          />
          <span className={cls(context, style.stub, style.stubSize[size])} />
        </div>
        <span className={cls(context, style.join, style.joinSize[size])}>
          {join}
        </span>
      </div>
      {notes.length > 0 ? (
        <dl className={cls(context, style.notes, style.notesSize[size])}>
          {notes.map(({ title, body }, index) => (
            <div key={index} className={cls(context, style.note)}>
              <dt
                className={cls(
                  context,
                  style.noteTitle,
                  style.noteTitleSize[size]
                )}>
                {title}
              </dt>
              <dd
                className={cls(
                  context,
                  style.noteBody,
                  style.noteBodySize[size]
                )}>
                {marksReact(body, context)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
};
