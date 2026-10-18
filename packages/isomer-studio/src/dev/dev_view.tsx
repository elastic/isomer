/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useId, useState } from 'react';
import { EuiPanel, EuiResizableContainer, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { PrimitiveHeading } from '../chrome/primitive_heading';
import type { StudioRoute } from '../chrome/route';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';

import { EditorPanel, WorkbenchStatus } from './editor_panel';
import { PreviewPanel } from './preview_panel';
import { PropReference } from './prop_reference';
import { useEditor } from './use_editor';

const Workbench = ({
  doc,
  example,
  stacked,
  onExampleChange,
}: {
  doc: PrimitiveDoc;
  example: number;
  stacked: boolean;
  onExampleChange: (example: number) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const editor = useEditor(doc.examples[example]?.node ?? { type: doc.type });
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
        <PrimitiveHeading {...{ doc }} layout="inline" />
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
                <EditorPanel {...{ doc, example, editor, onExampleChange }} />
              </Panel>
              <Resizer indicator="border" />
              <Panel
                initialSize={60}
                minSize="0px"
                paddingSize="none"
                color="transparent">
                <PreviewPanel
                  {...{ composition, validation }}
                  supported={doc.surfaces}
                />
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

export interface DevViewProps {
  route: StudioRoute;
  stacked: boolean;
  navigate: (next: Partial<StudioRoute>) => void;
}

/** The workbench: edit one example beside the previews, or above them when space is tight. */
export const DevView = ({
  route: { page, example },
  stacked,
  navigate,
}: DevViewProps) => {
  const {
    docs: { primitives },
  } = useStudio();
  const doc = primitives.find(({ type }) => type === page);
  if (!doc) {
    return null;
  }

  return (
    <Workbench
      key={`${page}/${example}`}
      {...{ doc, example, stacked }}
      onExampleChange={(next) => navigate({ example: next })}
    />
  );
};
