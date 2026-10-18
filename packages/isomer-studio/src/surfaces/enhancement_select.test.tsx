/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { EnhancementSelect } from './enhancement_select';

describe('EnhancementSelect', () => {
  it('shows the name and description, falling back to the id for the label', () => {
    const onChange = vi.fn();
    render(
      <EnhancementSelect
        definitions={[
          {
            id: 'slideCopy',
            name: 'Copy command',
            description: 'Adds a Copy button to each slideCommand.',
            appliesTo: () => true,
          },
          { id: 'plain', appliesTo: () => true },
        ]}
        selected={[]}
        disabled={false}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Enhancements (0/2)' }));
    expect(screen.getByLabelText('Copy command')).toBeInTheDocument();
    expect(
      screen.getByText('Adds a Copy button to each slideCommand.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('plain')).toBeInTheDocument();
  });
});
