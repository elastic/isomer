/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';
import { ReactSurface } from '../surfaces/react_surface';
import { ScaledPreview } from '../surfaces/scaled_preview';

const PREVIEW_HEIGHT = 140;

/** A primitive's first example, group and purpose, as the content of its nav entry's tooltip. */
export const PrimitivePeek = ({ type }: { type: string }) => {
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
  const { group, purpose } = doc;

  return (
    <>
      {composition ? (
        <div
          aria-hidden={true}
          css={css`
            max-block-size: ${PREVIEW_HEIGHT}px;
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
      <EuiText size="xs" color="subdued">
        <p>{group}</p>
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiText size="xs">
        <p>{purpose}</p>
      </EuiText>
    </>
  );
};
