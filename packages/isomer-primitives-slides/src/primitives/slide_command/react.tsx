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
import { slideDistillery } from '../../theme/distillery';
import { labelModule } from '../../theme/modules';

import { commandSize } from './fit';
import type { SlideCommandNode } from './schema';
import { commandModule } from './styles';

const { prompt } = slideDistillery.tokens.command;

/** React renderer for {@link SlideCommandNode}. */
export const react = (
  { type, label, command, highlightPrefix = '' }: SlideCommandNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: styles } = commandModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, styles.root)}>
      {/* The space after the label is never drawn; it keeps the label apart in the text. */}
      {label ? (
        <>
          <span className={cls(context, labelModule.handles.label)}>
            {label}
          </span>{' '}
        </>
      ) : null}
      <div
        className={cls(
          context,
          styles.panel,
          styles.textSize[commandSize(command)]
        )}>
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
      </div>
    </div>
  );
};
