/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, Suspense } from 'react';
import { EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

import type { EditorFormat } from './use_editor';

const MonacoEditor = lazy(() =>
  import('./monaco_editor').then(({ MonacoEditor: component }) => ({
    default: component,
  }))
);

export interface CodeEditorProps {
  format: EditorFormat;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
}

/** The source editor, type-checked against the runtime's authoring types. */
export const CodeEditor = ({
  format,
  value,
  onChange,
  ariaLabel,
}: CodeEditorProps) => {
  const {
    docs: { authoring },
  } = useStudio();

  return (
    <Suspense
      fallback={
        <EuiFlexGroup
          justifyContent="center"
          alignItems="center"
          css={css`
            flex: 1;
          `}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexGroup>
      }>
      <MonacoEditor {...{ format, value, onChange, ariaLabel, authoring }} />
    </Suspense>
  );
};
