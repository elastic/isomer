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
import { commandLineWidth } from '../../theme/components/command';
import { slideDistillery } from '../../theme/distillery';
import { labelModule } from '../../theme/modules';
import { monoWidth, sizeForWidth } from '../size';

import { SLIDE_COPY } from './copy';
import type { SlideCommandNode } from './schema';
import { commandModule } from './styles';

const { copy, prompt, textSizes } = slideDistillery.tokens.command;

/** React renderer for {@link SlideCommandNode}. */
export const react = (
  { type, label, command, highlightPrefix = '' }: SlideCommandNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: styles } = commandModule;
  const step = sizeForWidth(
    undefined,
    monoWidth(`${prompt.value}${command}`),
    commandLineWidth,
    textSizes
  );
  const copyable = context?.enhancements?.has(SLIDE_COPY) ?? false;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, styles.root)}>
      {label ? (
        <span className={cls(context, labelModule.handles.label)}>{label}</span>
      ) : null}
      <div className={cls(context, styles.panel, styles.textSize[step])}>
        <span aria-hidden className={cls(context, styles.prompt)}>
          {prompt.value}
        </span>
        <code className={cls(context, styles.line)}>
          {highlightPrefix ? (
            <span className={cls(context, styles.highlight)}>
              {highlightPrefix}
            </span>
          ) : null}
          {command.slice(highlightPrefix.length)}
        </code>
        {copyable ? (
          <button
            className={cls(context, styles.copy)}
            onClick={() => {
              void navigator.clipboard?.writeText(command);
            }}
            type="button">
            {copy.label.value}
          </button>
        ) : null}
      </div>
    </div>
  );
};
