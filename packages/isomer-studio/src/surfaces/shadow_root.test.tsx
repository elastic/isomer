/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';

import { ShadowRootHost } from './shadow_root';

describe('ShadowRootHost', () => {
  it('keeps a preview from adding a main landmark or a top-level heading to the page', async () => {
    const { container } = render(
      <ShadowRootHost>
        {() => (
          <main>
            <h1>Slide title</h1>
            <h1 aria-level={3}>Kept level</h1>
          </main>
        )}
      </ShadowRootHost>
    );
    const root = (container.firstElementChild as HTMLElement).shadowRoot!;

    await waitFor(() =>
      expect(root.querySelector('main')).toHaveAttribute('role', 'generic')
    );
    const [title, kept] = root.querySelectorAll('h1');
    expect(title).toHaveAttribute('aria-level', '2');
    expect(kept).toHaveAttribute('aria-level', '3');
  });

  it('demotes what renders into the preview later', async () => {
    const { container, rerender } = render(
      <ShadowRootHost>{() => <p>First</p>}</ShadowRootHost>
    );
    const root = (container.firstElementChild as HTMLElement).shadowRoot!;
    await waitFor(() => expect(root.textContent).toBe('First'));

    rerender(
      <ShadowRootHost>
        {() => (
          <main>
            <h1>Later</h1>
          </main>
        )}
      </ShadowRootHost>
    );

    await waitFor(() =>
      expect(root.querySelector('main')).toHaveAttribute('role', 'generic')
    );
    expect(root.querySelector('h1')).toHaveAttribute('aria-level', '2');
  });

  it('demotes explicit landmark and heading markup, and leaves other roles and levels alone', async () => {
    const { container } = render(
      <ShadowRootHost>
        {() => (
          <>
            <div role="main" data-case="div main" />
            <main role="main" data-case="main main" />
            <h1 aria-level={1} data-case="h1 level 1" />
            <div role="heading" aria-level={1} data-case="role heading 1" />
            <h2 aria-level={1} data-case="h2 level 1" />
            <nav data-case="nav" />
            <div role="region" aria-label="Kept" data-case="region" />
            <h2 data-case="h2" />
            <div role="heading" data-case="role heading" />
          </>
        )}
      </ShadowRootHost>
    );
    const root = (container.firstElementChild as HTMLElement).shadowRoot!;
    const attributes = (name: string): Record<string, string | null> =>
      Object.fromEntries(
        [...root.querySelectorAll('[data-case]')].map((element) => [
          element.getAttribute('data-case') ?? '',
          element.getAttribute(name),
        ])
      );

    await waitFor(() =>
      expect(attributes('role')).toEqual({
        'div main': 'generic',
        'main main': 'generic',
        'h1 level 1': null,
        'role heading 1': 'heading',
        'h2 level 1': null,
        nav: null,
        region: 'region',
        h2: null,
        'role heading': 'heading',
      })
    );
    expect(attributes('aria-level')).toEqual({
      'div main': null,
      'main main': null,
      'h1 level 1': '2',
      'role heading 1': '2',
      'h2 level 1': '2',
      nav: null,
      region: null,
      h2: null,
      'role heading': null,
    });
  });

  it('demotes a heading again when an attribute change makes it level one', async () => {
    const { container, rerender } = render(
      <ShadowRootHost>{() => <h1 aria-level={3}>Title</h1>}</ShadowRootHost>
    );
    const root = (container.firstElementChild as HTMLElement).shadowRoot!;
    await waitFor(() =>
      expect(root.querySelector('h1')).toHaveAttribute('aria-level', '3')
    );

    rerender(<ShadowRootHost>{() => <h1>Title</h1>}</ShadowRootHost>);

    await waitFor(() =>
      expect(root.querySelector('h1')).toHaveAttribute('aria-level', '2')
    );
  });
});
