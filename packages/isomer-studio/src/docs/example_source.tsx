/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiThemeProvider,
  useEuiTheme,
} from '@elastic/eui';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { printNodeJsx } from '@elastic/isomer-sdk/author';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

const FORMATS = ['jsx', 'json'] as const;

type SourceFormat = (typeof FORMATS)[number];

const themeWrapper = {
  css: css`
    display: contents;
  `,
};

const useExampleSource = (node: PrimitiveNode) => {
  const { schemaFor, shim } = useStudio();
  return useMemo(
    () => ({
      jsx: printNodeJsx(node, { schemaFor, shim }),
      json: JSON.stringify(node, null, 2),
    }),
    [node, schemaFor, shim]
  );
};

const SourcePanel = ({
  format,
  source,
  onFormat,
  onClose,
}: {
  format: SourceFormat;
  source: Record<SourceFormat, string>;
  onFormat: (format: SourceFormat) => void;
  onClose: () => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const text = source[format];

  return (
    <div
      css={css`
        background: ${euiTheme.colors.backgroundBasePlain};
        color: ${euiTheme.colors.text};
        border-top: ${euiTheme.border.thin};
      `}>
      <div
        css={css`
          display: flex;
          align-items: center;
          gap: ${euiTheme.size.s};
          padding-inline: ${euiTheme.size.m};
          border-bottom: ${euiTheme.border.thin};
        `}>
        <div
          role="tablist"
          aria-label="Example source format"
          css={css`
            display: flex;
            gap: ${euiTheme.size.m};
          `}>
          {FORMATS.map((id) => {
            const isSelected = id === format;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                id={`example-source-${id}`}
                aria-selected={isSelected}
                aria-controls="example-source-panel"
                onClick={() => onFormat(id)}
                css={css`
                  padding-block: ${euiTheme.size.s};
                  border: none;
                  font: inherit;
                  border-bottom: 2px solid
                    ${isSelected ? euiTheme.colors.primary : 'transparent'};
                  background: transparent;
                  color: ${
                    isSelected
                      ? euiTheme.colors.text
                      : euiTheme.colors.textSubdued
                  };
                  font-weight: ${euiTheme.font.weight.semiBold};
                  cursor: pointer;
                `}>
                {id.toUpperCase()}
              </button>
            );
          })}
        </div>
        <div
          css={css`
            flex: 1;
          `}
        />
        <EuiCopy textToCopy={text}>
          {(copy) => (
            <EuiButtonIcon
              iconType="copy"
              aria-label={format === 'jsx' ? 'Copy JSX' : 'Copy JSON'}
              color="text"
              onClick={copy}
            />
          )}
        </EuiCopy>
        <EuiButtonIcon
          iconType="arrowUp"
          aria-label="Hide source"
          color="text"
          onClick={onClose}
        />
      </div>
      <div
        role="tabpanel"
        id="example-source-panel"
        aria-labelledby={`example-source-${format}`}
        css={css`
          max-height: 280px;
          overflow: auto;
        `}>
        <EuiCodeBlock
          language={format}
          fontSize="s"
          paddingSize="m"
          transparentBackground
          whiteSpace="pre-wrap">
          {text}
        </EuiCodeBlock>
      </div>
    </div>
  );
};

/** The example node as JSX or JSON, in a collapsible footer. */
export const ExampleSource = ({ node }: { node: PrimitiveNode }) => {
  const { euiTheme } = useEuiTheme();
  const source = useExampleSource(node);
  const [isOpen, setOpen] = useState(true);
  const [format, setFormat] = useState<SourceFormat>('jsx');

  if (!isOpen) {
    return (
      <div
        css={css`
          padding: ${euiTheme.size.xs} ${euiTheme.size.s};
          border-top: ${euiTheme.border.thin};
        `}>
        <EuiButtonEmpty
          size="s"
          iconType="arrowDown"
          iconSide="right"
          onClick={() => setOpen(true)}>
          View source
        </EuiButtonEmpty>
      </div>
    );
  }

  return (
    <EuiThemeProvider colorMode="dark" wrapperProps={themeWrapper}>
      <SourcePanel
        {...{ format, source }}
        onFormat={setFormat}
        onClose={() => setOpen(false)}
      />
    </EuiThemeProvider>
  );
};
