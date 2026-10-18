/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { formatValidationError } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { PrimitiveDoc } from '../model/describe_runtime';
import { useStudio } from '../studio_context';
import { ExamplePicker } from '../surfaces/example_picker';

import { CodeEditor } from './code_editor';
import type { EditorFormat, EditorState } from './use_editor';

const isFormat = (id: string): id is EditorFormat =>
  id === 'jsx' || id === 'json';

export const WorkbenchStatus = ({
  editor: { parseError, isParsing, validation, format },
  referenceOpen,
  referenceId,
  onToggleReference,
}: {
  editor: EditorState;
  referenceOpen: boolean;
  referenceId: string;
  onToggleReference: () => void;
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
          <EuiButtonEmpty
            size="xs"
            color="text"
            iconType={
              referenceOpen ? 'chevronSingleDown' : 'chevronSingleRight'
            }
            aria-expanded={referenceOpen}
            aria-controls={referenceId}
            onClick={onToggleReference}>
            Props
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem />
        <EuiFlexItem grow={false}>
          <EuiHealth color={health.color} textSize="xs">
            {health.label}
          </EuiHealth>
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
  onExampleChange: (example: number) => void;
}

/** The example picker and source editor above the shared workbench status. */
export const EditorPanel = ({
  doc,
  example,
  editor,
  onExampleChange,
}: EditorPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { transformJsx } = useStudio();
  const { label, examples } = doc;
  const { format, setFormat, source, setSource } = editor;

  const jsxButton = (
    <EuiButton id="jsx" isDisabled={!transformJsx} hasAriaDisabled>
      JSX
    </EuiButton>
  );

  return (
    <div
      role="region"
      aria-label="Source editor"
      css={css`
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;

        @media (max-width: 1120px) {
          width: 100%;
        }
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
            buttonSize="s"
            variant="selection"
            idSelected={format}
            display="highlighted"
            onChange={(id) => isFormat(id) && setFormat(id)}>
            {transformJsx ? (
              jsxButton
            ) : (
              <EuiToolTip content="The host supplied no JSX transform.">
                {jsxButton}
              </EuiToolTip>
            )}
            <EuiButton id="json">JSON</EuiButton>
          </EuiButtonGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiCopy textToCopy={source}>
            {(copy) => (
              <EuiToolTip content={format === 'jsx' ? 'Copy JSX' : 'Copy JSON'}>
                <EuiButtonIcon
                  size="s"
                  color="text"
                  iconType="copy"
                  aria-label={format === 'jsx' ? 'Copy JSX' : 'Copy JSON'}
                  onClick={copy}
                />
              </EuiToolTip>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>
      <CodeEditor
        {...{ format }}
        value={source}
        onChange={setSource}
        ariaLabel={`${label} source`}
      />
    </div>
  );
};
