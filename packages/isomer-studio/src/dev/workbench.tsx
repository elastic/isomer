/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useId, useState } from 'react';
import { EuiPanel, EuiResizableContainer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import type { PrimitiveDoc, StudioSurface } from '../model/describe_runtime';

import { WorkbenchStatus } from './editor_panel';
import { PreviewPanel } from './preview_panel';
import { PropReference } from './prop_reference';
import type { EditorState } from './use_editor';

export interface WorkbenchProps {
  heading: ReactNode;
  /** The source column, usually an `EditorPanel` over {@link WorkbenchProps.editor}. */
  source: ReactNode;
  /** Shown in place of the outputs, such as while held JSX waits to run. */
  preview?: ReactNode;
  editor: EditorState;
  supported: readonly StudioSurface[];
  stacked: boolean;
  /** The primitive the Props reference opens on; it then lists the draft's other types. */
  doc?: PrimitiveDoc | undefined;
}

/** A source editor beside its previews, or above them when space is tight, over a status bar. */
export const Workbench = ({
  heading,
  source,
  preview,
  editor,
  supported,
  stacked,
  doc,
}: WorkbenchProps) => {
  const { euiTheme } = useEuiTheme();
  const { composition, validation } = editor;
  const [referenceOpen, setReferenceOpen] = useState(false);
  const referenceId = useId();

  return (
    <div
      css={css`
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        padding: ${euiTheme.size.l};
      `}>
      <div
        css={css`
          margin-bottom: ${euiTheme.size.base};
        `}>
        {heading}
      </div>
      <EuiPanel
        role="region"
        aria-label="Composition workbench"
        paddingSize="none"
        css={css`
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        `}>
        <EuiResizableContainer
          direction={stacked ? 'vertical' : 'horizontal'}
          css={css`
            flex: 1;
            min-height: 0;
          `}>
          {(Panel, Resizer) => (
            <>
              <Panel
                initialSize={40}
                minSize="360px"
                paddingSize="none"
                color="transparent">
                {source}
              </Panel>
              <Resizer indicator="border" />
              <Panel
                initialSize={60}
                minSize="0px"
                paddingSize="none"
                color="transparent">
                {preview ?? (
                  <PreviewPanel {...{ composition, validation, supported }} />
                )}
              </Panel>
            </>
          )}
        </EuiResizableContainer>
        <div
          css={css`
            flex: 0 1 auto;
            min-height: 0;
            max-height: 40%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border-top: ${euiTheme.border.thin};
          `}>
          <div
            css={css`
              flex: 0 1 auto;
              min-height: 0;
              display: flex;
              flex-direction: column;
              padding: ${euiTheme.size.s} ${euiTheme.size.base};
            `}>
            <WorkbenchStatus
              {...{ editor, referenceOpen, referenceId }}
              onToggleReference={() => setReferenceOpen((open) => !open)}
            />
          </div>
          {referenceOpen ? (
            <PropReference {...{ doc }} nodes={editor.nodes} id={referenceId} />
          ) : null}
        </div>
      </EuiPanel>
    </div>
  );
};
