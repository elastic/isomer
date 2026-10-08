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

const COLUMNS: Array<EuiBasicTableColumn<PropDescriptor>> = [
  {
    name: 'Name',
    width: '14em',
    render: ({ name, required }: PropDescriptor) => (
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiCode>{name}</EuiCode>
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
    width: '10em',
    render: ({ kind, type }: PropDescriptor) => (
      <EuiText size="s" color="subdued">
        {kind === 'enum' ? 'enum' : type}
      </EuiText>
    ),
  },
  {
    name: 'Description',
    render: ({ values, description }: PropDescriptor) =>
      values || description ? (
        <EuiText size="s">
          {values ? <p>{values.join(' | ')}</p> : null}
          {description ? <p>{description}</p> : null}
        </EuiText>
      ) : (
        <EuiText size="s" color="subdued">
          —
        </EuiText>
      ),
  },
];

/** A primitive's props, read from its authoring JSON Schema. */
export const PropsTable = ({ props }: { props: PropDescriptor[] }) => (
  <EuiBasicTable<PropDescriptor>
    tableCaption="Props"
    items={props}
    columns={COLUMNS}
    itemId="name"
    noItemsMessage="This primitive has no props besides its type."
  />
);
