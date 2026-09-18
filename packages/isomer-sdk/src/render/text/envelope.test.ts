/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { PrimitiveNode } from '../../define/primitive_module';

import { renderTextEnvelope, type TextEnvelopeDispatcher } from './envelope';

interface NoteNode extends PrimitiveNode {
  type: 'note';
  body: string;
}

const dispatcher: TextEnvelopeDispatcher<NoteNode> = {
  renderText: (node) => node.body,
};

describe('renderTextEnvelope', () => {
  it('uppercases the title, keeps the subtitle, and joins nodes with blank lines', () => {
    expect(
      renderTextEnvelope(
        {
          type: 'view',
          title: 'Checkout',
          subtitle: 'last 15m',
          body: [
            { type: 'note', body: 'one' },
            { type: 'note', body: 'two' },
          ],
        },
        dispatcher
      )
    ).toBe('CHECKOUT\n\nlast 15m\n\none\n\ntwo');
  });

  it('omits an absent title and subtitle and drops empty node output', () => {
    expect(
      renderTextEnvelope(
        {
          type: 'view',
          body: [
            { type: 'note', body: 'one' },
            { type: 'note', body: '' },
            { type: 'note', body: 'two' },
          ],
        },
        dispatcher
      )
    ).toBe('one\n\ntwo');
  });
});
