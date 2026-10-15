/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';

import type { StudioPreviewProps } from '../config';
import { useStudio } from '../studio_context';

import { ReactSurface } from './react_surface';
import { ScaledPreview } from './scaled_preview';

type Composed = { composition: Composition } | { error: unknown };

/** The `Preview` an app receives: the React surface at the Studio's theme, read from context so its identity never changes. */
export const AppPreview = ({
  nodes,
  composition: given,
  zoom,
  maxHeight,
}: StudioPreviewProps) => {
  const { compose } = useStudio();
  const composed = useMemo((): Composed => {
    try {
      return { composition: given ?? compose(nodes ?? []) };
    } catch (error) {
      return { error };
    }
  }, [given, nodes, compose]);

  return 'error' in composed ? (
    <EuiCallOut
      announceOnMount
      size="s"
      color="danger"
      iconType="error"
      title="The config's compose threw"
      text={
        <p>
          {composed.error instanceof Error
            ? composed.error.message
            : String(composed.error)}
        </p>
      }
    />
  ) : (
    <ScaledPreview {...{ zoom, maxHeight }}>
      <ReactSurface composition={composed.composition} />
    </ScaledPreview>
  );
};
