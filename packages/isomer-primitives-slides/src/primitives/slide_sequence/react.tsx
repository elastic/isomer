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
import { sequenceFit } from '../../theme/components/sequence';
import {
  connectorModule,
  layoutModule,
  tonesModule,
} from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideSequenceNode } from './schema';
import { sequenceKey, sequenceModule } from './styles';

const { handles: sequence } = sequenceModule;
const { handles: connector } = connectorModule;
const { handles: tones } = tonesModule;

/** Grid line through the center of actor `index`. */
const centerLine = (index: number): number => 2 * index + 2;

/** React renderer for {@link SlideSequenceNode}. */
export const react = (
  { type, actors, messages, size }: SlideSequenceNode,
  { context }: SlideReactEnv
): ReactNode => {
  const step = sizeForLoad(
    size,
    messages.length,
    sequenceFit,
    context?.crowding
  );
  const indexOf = new Map(actors.map(({ id }, index) => [id, index]));
  const toneOf = new Map(actors.map(({ id, tone }) => [id, tone]));
  const span = (index: number) => [
    sequence.columnStart[sequenceKey(2 * index + 1)],
    sequence.columnSpan[sequenceKey(2)],
  ];
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          sequence.grid,
          sequence.columns[sequenceKey(actors.length)],
          sequence.rows[sequenceKey(messages.length)],
          sequence.gapSize[step]
        )}>
        {actors.map(({ id }, index) => (
          <span
            aria-hidden
            className={cls(context, sequence.lifeline, ...span(index))}
            key={`lifeline-${id}`}
          />
        ))}
        {actors.map(({ id, label, tone }, index) => (
          <span
            className={cls(
              context,
              sequence.actor,
              sequence.row[sequenceKey(1)],
              ...span(index),
              ...(tone ? [tones.tone[tone], sequence.actorToned] : [])
            )}
            key={id}>
            {label}
          </span>
        ))}
        {messages.map(({ from, to, label, mono }, index) => {
          const start = centerLine(indexOf.get(from) ?? 0);
          const end = centerLine(indexOf.get(to) ?? 0);
          const tone = toneOf.get(from);
          const rightward = end > start;
          const skips =
            Math.abs((indexOf.get(to) ?? 0) - (indexOf.get(from) ?? 0)) > 1;
          const head = rightward ? connector.headRight : connector.headLeft;
          return (
            <div
              className={cls(
                context,
                sequence.message,
                sequence.messageSize[step],
                sequence.row[sequenceKey(index + 2)],
                sequence.columnStart[sequenceKey(Math.min(start, end))],
                sequence.columnSpan[sequenceKey(Math.abs(end - start))],
                ...(tone ? [tones.tone[tone], connector.toned] : [])
              )}
              key={index}>
              <span
                className={cls(
                  context,
                  sequence.label,
                  sequence.labelSize[step],
                  skips
                    ? rightward
                      ? sequence.labelFromStart
                      : sequence.labelFromEnd
                    : undefined,
                  tone ? sequence.labelToned : undefined,
                  mono ? sequence.labelMono : undefined
                )}>
                {mono ? label : marksReact(label, context)}
              </span>
              <div
                aria-hidden
                className={cls(context, connector.across, sequence.arrow)}>
                {rightward ? null : <span className={cls(context, head)} />}
                <span className={cls(context, connector.railAcross)} />
                {rightward ? <span className={cls(context, head)} /> : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
