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
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { PrimitiveDoc } from '../model/describe_runtime';

const LAYOUTS = {
  stacked: 'l',
  inline: 'm',
} as const;

const PURPOSE_MIN_WIDTH = 280;
const PURPOSE_MAX_WIDTH = 720;

export interface PrimitiveHeadingProps {
  doc: Pick<PrimitiveDoc, 'label' | 'group' | 'purpose'>;
  /** `inline` sets the purpose beside the title, for pages that give most of their height to a workbench. */
  layout?: keyof typeof LAYOUTS;
}

/** A primitive page's breadcrumb, title, and purpose. */
export const PrimitiveHeading = ({
  doc: { label, group, purpose },
  layout = 'stacked',
}: PrimitiveHeadingProps) => {
  const { euiTheme } = useEuiTheme();
  const title = LAYOUTS[layout];
  const isInline = layout === 'inline';

  return (
    <div>
      <EuiText size="xs" color="subdued">
        {group} /{' '}
        <EuiText size="xs" component="span">
          {label}
        </EuiText>
      </EuiText>
      <EuiFlexGroup
        gutterSize={isInline ? 's' : 'm'}
        alignItems="center"
        responsive={false}
        wrap={isInline}
        css={css`
          margin-block: ${euiTheme.size.s};
        `}>
        <EuiFlexItem grow={!isInline}>
          <EuiTitle size={title}>
            <h1>{label}</h1>
          </EuiTitle>
        </EuiFlexItem>
        {isInline ? (
          <EuiFlexItem
            css={css`
              flex: 1 1 ${PURPOSE_MIN_WIDTH}px;
              max-width: ${PURPOSE_MAX_WIDTH}px;
              margin-inline-start: ${euiTheme.size.s};
              padding-inline-start: ${euiTheme.size.m};
              border-inline-start: ${euiTheme.border.thin};
            `}>
            <EuiText size="s">
              <p
                title={purpose}
                css={css`
                  display: -webkit-box;
                  -webkit-box-orient: vertical;
                  -webkit-line-clamp: 2;
                  overflow: hidden;
                `}>
                {purpose}
              </p>
            </EuiText>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
      {isInline ? null : (
        <EuiText>
          <p>{purpose}</p>
        </EuiText>
      )}
    </div>
  );
};
