/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiCodeBlock,
  EuiCopy,
  EuiTab,
  EuiTabs,
  EuiThemeProvider,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { printNodeJsx } from '@elastic/isomer-sdk/author';
import { css } from '@emotion/react';

import { useStudio } from '../studio_context';

const FORMATS = ['jsx', 'json'] as const;

type SourceFormat = (typeof FORMATS)[number];

const SOURCE_MAX_HEIGHT = 280;

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
}: {
  format: SourceFormat;
  source: Record<SourceFormat, string>;
  onFormat: (format: SourceFormat) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const idPrefix = useGeneratedHtmlId({ prefix: 'exampleSource' });
  const panelId = `${idPrefix}-panel`;
  const tabId = (id: SourceFormat) => `${idPrefix}-${id}`;
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
        <EuiTabs
          size="s"
          bottomBorder={false}
          aria-label="Example code format"
          css={css`
            flex: 1;
          `}>
          {FORMATS.map((id) => (
            <EuiTab
              key={id}
              id={tabId(id)}
              isSelected={id === format}
              aria-controls={panelId}
              onClick={() => onFormat(id)}>
              {id.toUpperCase()}
            </EuiTab>
          ))}
        </EuiTabs>
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
      </div>
      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(format)}
        css={css`
          max-height: ${SOURCE_MAX_HEIGHT}px;
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

/** The example node as JSX or JSON. */
export const ExampleSource = ({
  node,
  isOpen,
}: {
  node: PrimitiveNode;
  isOpen: boolean;
}) => {
  const source = useExampleSource(node);
  const [format, setFormat] = useState<SourceFormat>('jsx');

  return (
    <div hidden={!isOpen}>
      <EuiThemeProvider colorMode="dark" wrapperProps={themeWrapper}>
        <SourcePanel {...{ format, source }} onFormat={setFormat} />
      </EuiThemeProvider>
    </div>
  );
};
