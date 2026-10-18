/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { render, screen } from '@testing-library/react';
import { z } from 'zod';

import type { PrimitiveDoc } from '../model/describe_runtime';
import type { StudioContextValue } from '../studio_context';
import { StudioContextProvider } from '../studio_context';

import { PropReference } from './prop_reference';

const doc = {
  type: 'split',
  label: 'Split',
  props: [{ name: 'panes', type: 'array', kind: 'other', required: true }],
  definition: { schema: z.object({ type: z.literal('split') }) },
} as unknown as PrimitiveDoc;

// The reference reads only the runtime's primitives and the docs.
const value = {
  runtime: {
    primitives: [
      {
        type: 'split',
        children: (node: { panes: unknown[] }) => node.panes.flatMap(() => []),
      },
    ],
  },
  docs: { primitives: [doc] },
} as unknown as StudioContextValue;

describe('PropReference', () => {
  it('lists the selected primitive when the draft is missing its children', () => {
    render(
      <EuiProvider>
        <StudioContextProvider {...{ value }}>
          <PropReference
            {...{ doc }}
            nodes={[{ type: 'split' }]}
            id="reference"
          />
        </StudioContextProvider>
      </EuiProvider>
    );

    expect(screen.getByRole('tab', { name: 'Split' })).toBeInTheDocument();
    expect(screen.getByText('panes', { selector: 'code' })).toBeInTheDocument();
  });
});
