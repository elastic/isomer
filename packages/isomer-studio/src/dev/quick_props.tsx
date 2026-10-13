/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import {
  EuiButtonEmpty,
  EuiContextMenu,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import type { PropDescriptor } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import type { PrimitiveDoc } from '../model/describe_runtime';

const ROOT_PANEL = 'props';

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

export interface QuickPropsProps {
  doc: PrimitiveDoc;
  node: PrimitiveNode | undefined;
  onChange: (node: PrimitiveNode) => void;
}

/** A menu of one-click edits from the schema: enum values to pick, and optional props to add. */
export const QuickProps = ({ doc, node, onChange }: QuickPropsProps) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setOpen] = useState(false);
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

  const apply = (name: string, value: unknown) => {
    setOpen(false);
    onChange(withField(node, name, value));
  };

  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: ROOT_PANEL,
      title: 'Props',
      items: [
        ...enums.map(({ name }): EuiContextMenuPanelItemDescriptor => {
          const value = fields.get(name);
          return {
            name: `${name}: ${typeof value === 'string' ? value : 'unset'}`,
            panel: name,
          };
        }),
        ...addable.map((prop): EuiContextMenuPanelItemDescriptor => ({
          name: `+ ${prop.name}`,
          'aria-label': `Add ${prop.name}`,
          onClick: () => apply(prop.name, exampleValue(doc, prop)),
        })),
      ],
    },
    ...enums.map(
      ({ name, values = [], required }): EuiContextMenuPanelDescriptor => {
        const value = fields.get(name);
        return {
          id: name,
          title: name,
          items: [
            ...values.map((option): EuiContextMenuPanelItemDescriptor => ({
              name: option,
              icon: option === value ? 'check' : 'empty',
              onClick: () => apply(name, option),
            })),
            ...(typeof value === 'string' && !required
              ? [
                  {
                    name: `Remove ${name}`,
                    icon: 'cross',
                    onClick: () => apply(name, undefined),
                  },
                ]
              : []),
          ],
        };
      }
    ),
  ];

  return (
    <EuiPopover
      aria-label="Props"
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiButtonEmpty
          size="xs"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setOpen((open) => !open)}
          css={css`
            border: ${euiTheme.border.width.thin} dashed
              ${euiTheme.colors.borderBasePlain};
          `}>
          + Prop
        </EuiButtonEmpty>
      }>
      <EuiContextMenu
        initialPanelId={ROOT_PANEL}
        {...{ panels }}
        css={css`
          min-width: 220px;
        `}
      />
    </EuiPopover>
  );
};
