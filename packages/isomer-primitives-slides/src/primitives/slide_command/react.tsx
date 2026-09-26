/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useEffect, useState } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { commandLineWidth } from '../../theme/components/command';
import { slideDistillery } from '../../theme/distillery';
import { labelModule } from '../../theme/modules';
import { monoWidth, sizeForWidth } from '../size';

import { COPY_BUTTON_ATTRIBUTE, SLIDE_COPY } from './copy';
import type { SlideCommandNode } from './schema';
import { commandModule } from './styles';

const { copy, prompt, textSizes } = slideDistillery.tokens.command;

/**
 * Hidden until something can copy: its own click handler in a live React
 * render, or the {@link SLIDE_COPY} script in static HTML.
 */
const CopyButton = ({
  className,
  command,
  label,
}: {
  className: string;
  command: string;
  label: string;
}) => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(navigator.clipboard !== undefined);
  }, []);
  return (
    <button
      {...{ [COPY_BUTTON_ATTRIBUTE]: '' }}
      className={className}
      hidden={!ready}
      onClick={() => {
        void navigator.clipboard.writeText(command);
      }}
      type="button">
      {label}
    </button>
  );
};

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
          <CopyButton
            className={cls(context, styles.copy)}
            command={command}
            label={copy.label.value}
          />
        ) : null}
      </div>
    </div>
  );
};
