/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
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

import { useStudio } from '../studio_context';

import { CodeEditor } from './code_editor';
import type { EditorFormat, EditorState } from './use_editor';

const isFormat = (id: string): id is EditorFormat =>
  id === 'jsx' || id === 'json';

export const WorkbenchStatus = ({
  editor: { parseError, isParsing, isHeld, validation, format },
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
  const health = isHeld
    ? { color: 'warning', label: 'Not run' }
    : parseError
      ? {
          color: 'danger',
          label: format === 'jsx' ? 'JSX error' : 'JSON error',
        }
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
      <EuiFlexGroup
        gutterSize="s"
        alignItems="center"
        responsive={false}
        css={css`
          flex: none;
        `}>
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
      {!isHeld && (parseError || errors.length) ? (
        <EuiText
          size="xs"
          color="danger"
          role="region"
          tabIndex={0}
          aria-label="Validation errors"
          css={css`
            flex: 0 1 auto;
            min-height: 0;
            overflow-y: auto;
          `}>
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
  editor: EditorState;
  ariaLabel: string;
  /** Toolbar controls before the format toggle, such as an example picker; they shrink first when space is tight. */
  leading?: ReactNode;
  /** `EuiFlexItem`s grouped with the copy button. */
  trailing?: ReactNode;
  /** Shown between the toolbar and the source. */
  banner?: ReactNode;
}

/** A toolbar, the source editor, and a banner between them, above the shared workbench status. */
export const EditorPanel = ({
  editor,
  ariaLabel,
  leading,
  trailing,
  banner,
}: EditorPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { transformJsx } = useStudio();
  const { format, setFormat, source, setSource, scope, isHeld } = editor;

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
        {leading ? (
          <EuiFlexItem
            grow={false}
            css={css`
              flex-shrink: 1;
              min-width: 0;
            `}>
            {leading}
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem
          grow={false}
          css={css`
            flex-shrink: 0;
          `}>
          <EuiButtonGroup
            legend="Source format"
            buttonSize="s"
            variant="selection"
            idSelected={format}
            display="highlighted"
            isDisabled={isHeld}
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
        <EuiFlexItem />
        <EuiFlexItem
          grow={false}
          css={css`
            flex-shrink: 0;
          `}>
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiCopy textToCopy={source}>
                {(copy) => (
                  <EuiToolTip
                    content={format === 'jsx' ? 'Copy JSX' : 'Copy JSON'}>
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
            {trailing}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      {banner}
      <CodeEditor
        {...{ format, scope }}
        value={source}
        onChange={setSource}
        {...{ ariaLabel }}
      />
    </div>
  );
};
