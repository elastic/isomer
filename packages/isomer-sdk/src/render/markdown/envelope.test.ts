/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { PrimitiveNode } from '../../define/primitive_module';

import {
  type MarkdownEnvelopeDispatcher,
  renderMarkdownEnvelope,
} from './envelope';

const dispatcher: MarkdownEnvelopeDispatcher<PrimitiveNode> = {
  renderText: () => '',
  renderMarkdown: () => '',
};

describe('renderMarkdownEnvelope', () => {
  it('emits the title as an h1 and the subtitle in italics', () => {
    expect(
      renderMarkdownEnvelope(
        { type: 'view', title: 'Checkout', subtitle: 'last 15m', body: [] },
        dispatcher
      )
    ).toBe('# Checkout\n\n_last 15m_');
  });

  it('applies the URL policy to an authored title and subtitle', () => {
    const rendered = renderMarkdownEnvelope(
      {
        type: 'view',
        title: '[Checkout](javascript:alert(1))',
        subtitle: 'See <javascript:alert(2)>',
        body: [],
      },
      dispatcher
    );
    expect(rendered).toBe('# Checkout\n\n_See javascript:alert(2)_');
    expect(rendered).not.toMatch(/\]\(\s*javascript:|<javascript:/i);
  });
});
