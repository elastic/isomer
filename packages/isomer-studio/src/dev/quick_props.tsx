/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { PropDescriptor } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { Accent } from '../chrome/accent';
import type { PrimitiveDoc } from '../model/describe_runtime';

const REMOVE = '__remove__';

const defaultFor = ({ kind, values }: PropDescriptor): unknown => {
  switch (kind) {
    case 'enum':
      return values?.[0];
    case 'string':
      return 'Text';
    case 'number':
      return 0;
    case 'boolean':
      return true;
    case 'array':
      return [];
    default:
      return {};
  }
};

/** A value for `name` from the first example that sets it, so an inserted prop starts out valid. */
const exampleValue = (doc: PrimitiveDoc, prop: PropDescriptor): unknown => {
  for (const { node } of doc.examples) {
    const value = new Map<string, unknown>(Object.entries(node)).get(prop.name);
    if (value !== undefined) {
      return value;
    }
  }
  return defaultFor(prop);
};

const withField = (
  node: PrimitiveNode,
  name: string,
  value: unknown
): PrimitiveNode => {
  const { type } = node;
  const entries = Object.entries(node).filter(([key]) => key !== 'type');
  const fields = Object.fromEntries(
    value === undefined
      ? entries.filter(([key]) => key !== name)
      : entries.some(([key]) => key === name)
        ? entries.map(([key, current]) => [key, key === name ? value : current])
        : [...entries, [name, value]]
  );
  return { type, ...fields };
};

const EnumChip = ({
  prop,
  value,
  accent,
  onChange,
}: {
  prop: PropDescriptor;
  value: unknown;
  accent: Accent;
  onChange: (value: unknown) => void;
}) => {
  const [isOpen, setOpen] = useState(false);
  const { name, values = [], required } = prop;
  const isSet = typeof value === 'string';

  const options: EuiSelectableOption[] = [
    ...values.map((option): EuiSelectableOption => ({
      key: option,
      label: option,
      checked: option === value ? 'on' : undefined,
    })),
    ...(isSet && !required ? [{ key: REMOVE, label: `Remove ${name}` }] : []),
  ];

  return (
    <EuiPopover
      aria-label={`${name} values`}
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiBadge
          color={isSet ? accent.light : 'hollow'}
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setOpen((open) => !open)}
          onClickAriaLabel={`Choose ${name}`}>
          {isSet ? `${name}: ${value}` : `+ ${name}`}
        </EuiBadge>
      }>
      <EuiSelectable
        singleSelection
        options={options}
        aria-label={`Choose ${name}`}
        onChange={(_options, _event, changed) => {
          setOpen(false);
          onChange(changed.key === REMOVE ? undefined : changed.key);
        }}
        listProps={{ bordered: false }}
        css={css`
          min-width: 200px;
        `}>
        {(list) => list}
      </EuiSelectable>
    </EuiPopover>
  );
};

export interface QuickPropsProps {
  doc: PrimitiveDoc;
  node: PrimitiveNode | undefined;
  accent: Accent;
  onChange: (node: PrimitiveNode) => void;
}

/** One-click edits from the schema: enum values to pick, and optional props to add. */
export const QuickProps = ({
  doc,
  node,
  accent,
  onChange,
}: QuickPropsProps) => {
  const { euiTheme } = useEuiTheme();
  if (!node || node.type !== doc.type) {
    return null;
  }
  const fields = new Map<string, unknown>(Object.entries(node));
  const enums = doc.props.filter(({ kind }) => kind === 'enum');
  const addable = doc.props.filter(
    ({ kind, required, name }) =>
      kind !== 'enum' && !required && !fields.has(name)
  );

  if (!enums.length && !addable.length) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" wrap alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText
          size="xs"
          color="subdued"
          css={css`
            margin-right: ${euiTheme.size.xs};
            text-transform: uppercase;
            font-weight: ${euiTheme.font.weight.semiBold};
          `}>
          Props
        </EuiText>
      </EuiFlexItem>
      {enums.map((prop) => (
        <EuiFlexItem grow={false} key={prop.name}>
          <EnumChip
            {...{ prop, accent }}
            value={fields.get(prop.name)}
            onChange={(value) => onChange(withField(node, prop.name, value))}
          />
        </EuiFlexItem>
      ))}
      {addable.map((prop) => (
        <EuiFlexItem grow={false} key={prop.name}>
          <EuiBadge
            color="hollow"
            onClick={() =>
              onChange(withField(node, prop.name, exampleValue(doc, prop)))
            }
            onClickAriaLabel={`Add ${prop.name}`}>
            + {prop.name}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
