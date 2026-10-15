/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { StudioApp } from '../config';
import { componentsPack } from '../fixtures/components_pack';
import { createShim } from '../model/compile_jsx';
import { describeRuntime } from '../model/describe_runtime';
import type { StudioContextValue } from '../studio_context';
import { StudioContextProvider } from '../studio_context';

import type { StudioNavProps } from './nav';
import { StudioNav } from './nav';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const decks: StudioApp = {
  id: 'decks',
  title: 'Decks',
  load: () => Promise.reject(new Error('never loaded')),
  pages: [
    { path: 'about', title: 'About decks' },
    { path: 'isomer', title: 'Isomer', section: 'Shown' },
    { path: 'isomer/3', title: 'Isomer, slide 3', section: 'Shown' },
    { path: 'drafts/a', title: 'Draft A', section: 'Drafts' },
  ],
};

const value: StudioContextValue = {
  runtime,
  apps: [decks],
  docs: describeRuntime(runtime),
  shim: createShim(runtime.primitives),
  schemaFor: () => undefined,
  theme: 'light',
  compose: (nodes) => ({ type: 'view', body: [...nodes] }),
};

const renderNav = (props: Partial<StudioNavProps> = {}) => {
  const onSelectApp = vi.fn();
  render(
    <EuiProvider>
      <StudioContextProvider {...{ value }}>
        <StudioNav
          mode="dev"
          page="callout"
          isOpen
          onToggle={() => undefined}
          onSelect={() => undefined}
          {...{ onSelectApp }}
          {...props}
        />
      </StudioContextProvider>
    </EuiProvider>
  );
  return { nav: screen.getByRole('navigation'), onSelectApp };
};

const pageList = () => screen.getByRole('list', { name: 'Decks pages' });

const texts = (elements: readonly HTMLElement[]) =>
  elements.map(({ textContent }) => textContent);

describe('StudioNav app pages', () => {
  beforeEach(() => {
    window.localStorage.removeItem('isomer-studio:nav-closed-groups');
  });

  it('lists pages under their app and sections, and opens the app at a page', () => {
    const { onSelectApp } = renderNav();
    const list = pageList();

    expect(texts(within(list).getAllByRole('button'))).toEqual([
      'About decks',
      'Isomer',
      'Isomer, slide 3',
      'Draft A',
    ]);
    expect(texts(within(list).getAllByRole('heading'))).toEqual([
      'Shown',
      'Drafts',
    ]);
    expect(
      texts(
        within(within(list).getByRole('list', { name: 'Drafts' })).getAllByRole(
          'button'
        )
      )
    ).toEqual(['Draft A']);

    fireEvent.click(within(list).getByRole('button', { name: 'Isomer' }));
    expect(onSelectApp).toHaveBeenLastCalledWith('decks', 'isomer');
    fireEvent.click(screen.getByRole('button', { name: 'Decks' }));
    expect(onSelectApp).toHaveBeenLastCalledWith('decks');
  });

  it.each([
    ['isomer/3/2', 'Isomer, slide 3'],
    ['isomer/2', 'Isomer'],
    ['elsewhere', 'Decks'],
  ])('marks the longest page at or above %j as current', (appPath, current) => {
    const { nav } = renderNav({ app: 'decks', appPath });
    const [only, ...rest] = within(nav).getAllByRole('button', {
      current: 'page',
    });
    expect(rest).toEqual([]);
    expect(only).toHaveAccessibleName(current);
  });

  it('narrows pages to titles matching the filter', () => {
    const { nav } = renderNav();
    fireEvent.change(
      within(nav).getByRole('searchbox', { name: 'Filter primitives' }),
      { target: { value: 'slide 3' } }
    );
    expect(texts(within(pageList()).getAllByRole('button'))).toEqual([
      'Isomer, slide 3',
    ]);
    expect(within(pageList()).getAllByRole('heading')).toHaveLength(1);

    fireEvent.change(
      within(nav).getByRole('searchbox', { name: 'Filter primitives' }),
      { target: { value: 'nothing like this' } }
    );
    expect(screen.queryByRole('list', { name: 'Decks pages' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Decks' })).toBeInTheDocument();
  });

  it('shows only the app on the collapsed rail', () => {
    const { nav, onSelectApp } = renderNav({
      isOpen: false,
      app: 'decks',
      appPath: 'isomer/3',
    });
    expect(screen.queryByRole('list', { name: 'Decks pages' })).toBeNull();
    expect(within(nav).queryByRole('button', { name: 'Isomer' })).toBeNull();

    const app = within(nav).getByRole('button', { name: 'Decks' });
    expect(app).toHaveAttribute('aria-current', 'page');
    fireEvent.click(app);
    expect(onSelectApp).toHaveBeenLastCalledWith('decks');
  });
});
