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
import { slideDistillery } from '../../theme/distillery';
import { labelModule, layoutModule } from '../../theme/modules';

import { turnLines } from './lines';
import type { SlideTranscriptNode } from './schema';
import { transcriptModule } from './styles';

const { roleLabel } = slideDistillery.tokens.transcript;

/** React renderer for {@link SlideTranscriptNode}. */
export const react = (
  { type, label, turns }: SlideTranscriptNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: transcript } = transcriptModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill, transcript.root)}>
      {label ? (
        <div className={cls(context, labelModule.handles.label)}>{label}</div>
      ) : null}
      <ol className={cls(context, transcript.turns)}>
        {turns.map(({ format = 'prose', role, text }, index) => (
          <li
            className={cls(context, transcript.turn, transcript.speaker[role])}
            key={index}>
            {/* The space after it is never drawn; it keeps the role apart in the text. */}
            <span className={cls(context, transcript.role[role])}>
              {roleLabel[role].value}
            </span>{' '}
            <p
              className={cls(
                context,
                transcript.text,
                transcript.format[format]
              )}>
              {turnLines(text).map((line, row) => (
                <Fragment key={row}>
                  {row > 0 ? '\n' : null}
                  {line}
                </Fragment>
              ))}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
};
