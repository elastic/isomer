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
import { slideDistillery } from '../../theme/distillery';
import {
  connectorModule,
  layoutModule,
  tonesModule,
} from '../../theme/modules';
import { countKey } from '../../theme/variants';
import { sizeForLoad } from '../size';

import type { SlideSequenceNode } from './schema';
import { sequenceModule } from './styles';

const { handles: sequence } = sequenceModule;
const { handles: connector } = connectorModule;
const { handles: tones } = tonesModule;
const { direction } = slideDistillery.tokens.sequence;

/** Grid line through actor `index`'s center. */
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
  const byId = new Map(actors.map((actor) => [actor.id, actor]));
  const span = (index: number) => [
    sequence.columnStart[countKey(2 * index + 1)],
    sequence.columnSpan[countKey(2)],
  ];
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          sequence.grid,
          sequence.columns[countKey(actors.length)],
          sequence.rows[countKey(messages.length)],
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
              sequence.row[countKey(1)],
              ...span(index),
              ...(tone ? [tones.tone[tone], sequence.actorToned] : [])
            )}
            key={id}>
            {label}
          </span>
        ))}
        {messages.map(({ from, to, label }, index) => {
          const fromIndex = indexOf.get(from) ?? 0;
          const toIndex = indexOf.get(to) ?? 0;
          const start = centerLine(fromIndex);
          const end = centerLine(toIndex);
          const tone = byId.get(from)?.tone;
          const rightward = end > start;
          const skips = Math.abs(toIndex - fromIndex) > 1;
          const head = rightward ? connector.headRight : connector.headLeft;
          return (
            <div
              className={cls(
                context,
                sequence.message,
                sequence.messageSize[step],
                sequence.row[countKey(index + 2)],
                sequence.columnStart[countKey(Math.min(start, end))],
                sequence.columnSpan[countKey(Math.abs(end - start))],
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
                  tone ? sequence.labelToned : undefined
                )}>
                {marksReact(label, context)}
              </span>
              <div
                role="img"
                aria-label={`${byId.get(from)?.label ?? from} ${direction.value} ${byId.get(to)?.label ?? to}`}
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
