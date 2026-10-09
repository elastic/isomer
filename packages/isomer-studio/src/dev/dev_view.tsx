/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiResizableContainer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { Accent } from '../chrome/accent';
import { PrimitiveTile } from '../chrome/primitive_tile';
import type { StudioRoute } from '../chrome/route';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';

import { EditorPanel } from './editor_panel';
import { PreviewPanel } from './preview_panel';
import { useEditor } from './use_editor';

const Workbench = ({
  doc,
  example,
  accent,
  onExampleChange,
}: {
  doc: PrimitiveDoc;
  example: number;
  accent: Accent;
  onExampleChange: (example: number) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const editor = useEditor(doc.examples[example]?.node ?? { type: doc.type });
  const { composition, validation } = editor;
  const { type, label, purpose } = doc;

  return (
    <div
      css={css`
        height: 100%;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.base};
        padding: ${euiTheme.size.base} ${euiTheme.size.l} ${euiTheme.size.l};
      `}>
      <div>
        <EuiFlexGroup
          gutterSize="s"
          alignItems="flexStart"
          responsive={false}
          direction="column">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <PrimitiveTile {...{ type }} />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTitle size="s">
                  <h2>{label}</h2>
                </EuiTitle>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s" color="subdued">
              <p>{purpose}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <EuiResizableContainer
        css={css`
          flex: 1;
          min-height: 0;
        `}>
        {(Panel, Resizer) => (
          <>
            <Panel
              initialSize={50}
              minSize="360px"
              paddingSize="none"
              color="transparent">
              <EditorPanel
                {...{ doc, example, editor, accent, onExampleChange }}
              />
            </Panel>
            <Resizer
              css={css`
                transform: translateX(${euiTheme.size.s});
              `}
            />
            <Panel
              initialSize={50}
              minSize="360px"
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
    </div>
  );
};

export interface DevViewProps {
  route: StudioRoute;
  navigate: (next: Partial<StudioRoute>) => void;
  accent: Accent;
}

/** The workbench: edit one example on the left, see it on every surface on the right. */
export const DevView = ({
  route: { page, example },
  navigate,
  accent,
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
      {...{ doc, example, accent }}
      onExampleChange={(next) => navigate({ example: next })}
    />
  );
};
