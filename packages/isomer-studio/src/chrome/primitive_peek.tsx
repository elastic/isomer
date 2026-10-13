/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';
import { ReactSurface } from '../surfaces/react_surface';
import { ScaledPreview } from '../surfaces/scaled_preview';

export const PEEK_DELAY = 0;
const PEEK_WIDTH = 320;
const PREVIEW_HEIGHT = 180;

const PeekContent = ({ type }: { type: string }) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives },
    compose,
  } = useStudio();
  const doc = primitives.find((candidate) => candidate.type === type);
  const [first] = doc?.examples ?? [];
  const composition = useMemo(
    () => (first ? compose([first.node]) : undefined),
    [compose, first]
  );

  if (!doc) {
    return null;
  }
  const { label, group, purpose } = doc;

  return (
    <div
      css={css`
        width: ${PEEK_WIDTH}px;
      `}>
      {composition ? (
        <div
          aria-hidden={true}
          css={css`
            max-height: ${PREVIEW_HEIGHT}px;
            overflow: hidden;
            pointer-events: none;
            border-radius: ${euiTheme.border.radius.small};
            background: ${euiTheme.colors.backgroundBaseSubdued};
          `}>
          <ScaledPreview maxHeight={PREVIEW_HEIGHT}>
            <ReactSurface {...{ composition }} />
          </ScaledPreview>
        </div>
      ) : null}
      <EuiSpacer size="s" />
      <EuiTitle size="xxs">
        <h4>{label}</h4>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        <p>{group}</p>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="s">
        <p>{purpose}</p>
      </EuiText>
    </div>
  );
};

/** Shows a primitive's first example and purpose beside `children` after the pointer rests on it. */
export const PrimitivePeek = ({
  type,
  children,
}: {
  type: string;
  children: ReactElement;
}) => {
  const [isOpen, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancel = () => clearTimeout(timer.current);
  const close = () => {
    cancel();
    setOpen(false);
  };

  useEffect(() => cancel, []);

  return (
    <div
      onMouseEnter={() => {
        cancel();
        timer.current = setTimeout(() => setOpen(true), PEEK_DELAY);
      }}
      onMouseLeave={close}
      onClickCapture={close}>
      <EuiPopover
        button={children}
        isOpen={isOpen}
        closePopover={close}
        anchorPosition="rightUp"
        ownFocus={false}
        display="block"
        panelPaddingSize="s"
        panelProps={{
          css: css`
            transition: opacity 0.2s ease-in-out;
            opacity: ${isOpen ? 1 : 0};
          `,
        }}
        aria-label="Primitive preview">
        {isOpen ? <PeekContent {...{ type }} /> : null}
      </EuiPopover>
    </div>
  );
};
