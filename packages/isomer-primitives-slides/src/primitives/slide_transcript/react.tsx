/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideDistillery } from '../../theme/distillery';
import { slideModules } from '../../theme/modules';

import type { SlideTranscriptNode } from './schema';

/** React renderer for {@link SlideTranscriptNode}. */
export const react = (
  node: SlideTranscriptNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: transcript } = slideModules.transcript;
  const { handles: label } = slideModules.label;
  const { roleLabel } = slideDistillery.tokens.transcript;
  return (
    <div>
      {node.label ? (
        <div className={cls(context, label.label)}>{node.label}</div>
      ) : null}
      <div className={cls(context, transcript.root)}>
        {node.turns.map(({ format = 'prose', role, text }, index) => (
          <div
            className={cls(context, transcript.turn, transcript.speaker[role])}
            key={index}>
            <span className={cls(context, transcript.role)}>
              {roleLabel[role].value}
            </span>
            <p
              className={cls(
                context,
                transcript.text,
                transcript.format[format]
              )}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
