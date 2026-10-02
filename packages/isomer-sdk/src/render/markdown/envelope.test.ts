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

  it('prints the title and subtitle as text', () => {
    const rendered = renderMarkdownEnvelope(
      {
        type: 'view',
        title: 'Q3\n# results *bold* [x](javascript:alert(1))',
        subtitle: 'snake_case_name\nline',
        body: [],
      },
      dispatcher
    );
    expect(rendered).toBe(
      String.raw`# Q3 # results \*bold\* \[x]\(javascript:alert(1))` +
        '\n\n_snake_case_name line_'
    );
  });

  it('leaves out the title and subtitle when heading is false', () => {
    expect(
      renderMarkdownEnvelope(
        {
          type: 'view',
          title: 'Checkout',
          subtitle: 'last 15m',
          body: [{ type: 'note' }],
        },
        { renderText: () => '', renderMarkdown: ({ type }) => type },
        { heading: false }
      )
    ).toBe('note');
  });
});
