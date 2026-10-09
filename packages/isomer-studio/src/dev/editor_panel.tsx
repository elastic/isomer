/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiPanel,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { formatValidationError } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { Accent } from '../chrome/accent';
import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ExamplePicker } from '../surfaces/example_picker';

import { CodeEditor } from './code_editor';
import { QuickProps } from './quick_props';
import type { EditorFormat, EditorState } from './use_editor';

const isFormat = (id: string): id is EditorFormat =>
  id === 'jsx' || id === 'json';

const Status = ({
  editor: { parseError, isParsing, validation, format, source },
}: {
  editor: EditorState;
}) => {
  const { errors } = validation;
  const health = parseError
    ? { color: 'danger', label: format === 'jsx' ? 'JSX error' : 'JSON error' }
    : isParsing
      ? { color: 'subdued', label: 'Checking…' }
      : errors.length
        ? {
            color: 'danger',
            label: `Invalid · ${errors.length} ${errors.length === 1 ? 'error' : 'errors'}`,
          }
        : { color: 'success', label: 'Valid' };

  return (
    <>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiHealth color={health.color} textSize="xs">
            {health.label}
          </EuiHealth>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={source}>
            {(copy) => (
              <EuiButtonEmpty size="xs" iconType="copy" onClick={copy}>
                {format === 'jsx' ? 'Copy JSX' : 'Copy JSON'}
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
      {parseError || errors.length ? (
        <EuiText size="xs" color="danger">
          <ul>
            {parseError ? (
              <li>{parseError}</li>
            ) : (
              errors.map((error) => (
                <li key={formatValidationError(error)}>
                  {formatValidationError(error)}
                </li>
              ))
            )}
          </ul>
        </EuiText>
      ) : null}
    </>
  );
};

export interface EditorPanelProps {
  doc: PrimitiveDoc;
  example: number;
  editor: EditorState;
  accent: Accent;
  onExampleChange: (example: number) => void;
}

/** The example picker, the source editor, quick edits and validity. */
export const EditorPanel = ({
  doc,
  example,
  editor,
  accent,
  onExampleChange,
}: EditorPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { transformJsx } = useStudio();
  const { label, examples } = doc;
  const { format, setFormat, source, setSource, nodes, setNodes } = editor;

  const formatOptions = [
    {
      id: 'jsx',
      label: 'JSX',
      isDisabled: !transformJsx,
      toolTipContent: transformJsx
        ? undefined
        : 'The host supplied no JSX transform.',
    },
    { id: 'json', label: 'JSON' },
  ];

  const section = css`
    padding: ${euiTheme.size.base};
  `;

  return (
    <EuiPanel
      paddingSize="none"
      hasShadow
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      `}>
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          flex-grow: 0;
          padding: ${euiTheme.size.s} ${euiTheme.size.base};
        `}>
        <EuiFlexItem grow={false}>
          <ExamplePicker
            {...{ examples, example }}
            onChange={onExampleChange}
          />
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend="Source format"
            options={formatOptions}
            idSelected={format}
            onChange={(id) => isFormat(id) && setFormat(id)}
            color={accent.color}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <CodeEditor
        {...{ format }}
        value={source}
        onChange={setSource}
        ariaLabel={`${label} source`}
      />
      <div
        css={css`
          ${section};
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}>
        <QuickProps
          {...{ doc, accent }}
          node={nodes[0]}
          onChange={(node) => setNodes([node, ...nodes.slice(1)])}
        />
        <Status {...{ editor }} />
      </div>
    </EuiPanel>
  );
};
