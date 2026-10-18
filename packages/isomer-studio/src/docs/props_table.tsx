/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
} from '@elastic/eui';
import type { PropDescriptor } from '@elastic/isomer-runtime';
import { css } from '@emotion/react';

import type { Accent } from '../chrome/accent';

import { InlineCode } from './inline_code';

/** An enum's values as a TypeScript union literal, such as `"l" | "m" | "s"`. */
export const enumLiteral = (values: readonly string[]): string =>
  values.map((value) => JSON.stringify(value)).join(' | ');

const columnsFor = (
  { text, light }: Accent,
  names: readonly string[]
): Array<EuiBasicTableColumn<PropDescriptor>> => [
  {
    name: 'Name',
    width: '14em',
    render: ({ name, required }: PropDescriptor) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiCode
            css={css`
              color: ${text};
              background: ${light};
            `}>
            {name}
          </EuiCode>
        </EuiFlexItem>
        {required ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">required</EuiBadge>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    ),
  },
  {
    name: 'Type',
    width: '12em',
    render: ({ type, values }: PropDescriptor) =>
      values ? (
        <EuiCode>{enumLiteral(values)}</EuiCode>
      ) : (
        <EuiText size="s" color="subdued">
          {type}
        </EuiText>
      ),
  },
  {
    name: 'Description',
    render: ({ description }: PropDescriptor) =>
      description ? (
        <EuiText size="s">
          <p>
            <span
              css={css`
                display: inline-block;
                max-inline-size: 72ch;
              `}>
              <InlineCode text={description} {...{ names }} />
            </span>
          </p>
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued">
          —
        </EuiText>
      ),
  },
];

/** A primitive's props, read from its authoring JSON Schema. */
export const PropsTable = ({
  props,
  accent,
  names,
}: {
  props: PropDescriptor[];
  accent: Accent;
  /** Primitive types to set as code where a description names them. */
  names: readonly string[];
}) => (
  <EuiBasicTable<PropDescriptor>
    tableCaption="Props"
    items={props}
    columns={columnsFor(accent, names)}
    itemId="name"
    noItemsMessage="This primitive has no props besides its type."
  />
);
