/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import type { StudioApp, StudioAppProps } from '../config';
import type { CalloutNode } from '../fixtures/components_pack';
import { componentsPack } from '../fixtures/components_pack';
import { IsomerStudio } from '../studio';

vi.mock('../dev/monaco_editor', async () => {
  const { createElement } =
    await vi.importActual<typeof import('react')>('react');
  return { MonacoEditor: () => createElement('textarea') };
});

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const inApp: CalloutNode = {
  type: 'callout',
  tone: 'primary',
  title: 'In the app',
  body: 'Rendered through Preview.',
};

const Counter = ({ Preview, theme, path, navigate }: StudioAppProps) => {
  const [count, setCount] = useState(0);
  return (
    <div>
      <p>{`count ${count}, path "${path}", theme ${theme}`}</p>
      <button type="button" onClick={() => setCount(count + 1)}>
        Increment
      </button>
      <button type="button" onClick={() => navigate('slides/2')}>
        Go
      </button>
      <Preview nodes={[inApp]} />
    </div>
  );
};

const deck = (load: StudioApp['load']): StudioApp => ({
  id: 'deck',
  title: 'Deck',
  load,
});

/** A new closure each call, as every config re-run makes. */
const sameLoad = (): StudioApp['load'] => () =>
  Promise.resolve({ default: Counter });

const countText = () => screen.findByText(/^count/);

const openDeck = async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Deck' }));
  return countText();
};

describe('Studio apps', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('opens an app from the nav, and keeps it mounted across sub-path navigation', async () => {
    render(<IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />);

    expect(await openDeck()).toHaveTextContent('count 0, path ""');
    expect(window.location.hash).toBe('#/app/deck/');
    expect(screen.getByRole('button', { name: 'Deck' })).toHaveAttribute(
      'aria-current',
      'page'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(await countText()).toHaveTextContent('count 1, path "slides/2"');
    expect(window.location.hash).toBe('#/app/deck/slides/2');
  });

  it('deep-links into an app, and returns to the remembered primitive from the header', async () => {
    window.location.hash = '#/docs/divider';
    render(<IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />);
    window.location.hash = '#/app/deck/a/b';
    fireEvent(window, new HashChangeEvent('hashchange'));

    expect(await countText()).toHaveTextContent('path "a/b"');

    fireEvent.click(screen.getByRole('button', { name: 'Dev' }));
    await waitFor(() => expect(window.location.hash).toBe('#/dev/divider/0'));
    expect(screen.queryByText(/^count/)).toBeNull();
  });

  it('keeps app state across a theme change and a config re-run, and resets it when load changes', async () => {
    const { rerender } = render(
      <IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />
    );
    await openDeck();
    fireEvent.click(screen.getByRole('button', { name: 'Increment' }));

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(await countText()).toHaveTextContent('count 1');
    expect(await countText()).toHaveTextContent('theme dark');

    rerender(<IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />);
    expect(await countText()).toHaveTextContent('count 1');

    rerender(
      <IsomerStudio
        {...{ runtime }}
        apps={[
          deck(() => Promise.resolve({ default: Counter, replaced: true })),
        ]}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/^count/)).toHaveTextContent('count 0')
    );
  });

  it('falls back to the first primitive and rewrites the hash when the open app goes away', async () => {
    const { rerender } = render(
      <IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />
    );
    await openDeck();

    rerender(<IsomerStudio {...{ runtime }} apps={[]} />);

    await waitFor(() => expect(window.location.hash).toMatch(/^#\/dev\//));
    expect(screen.queryByText(/^count/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Deck' })).toBeNull();
  });

  it('renders Preview output inside a shadow root', async () => {
    render(
      <IsomerStudio
        {...{ runtime }}
        createReactContext={() => ({})}
        apps={[deck(sameLoad())]}
      />
    );
    await openDeck();

    await waitFor(() => {
      const hosts = [...document.querySelectorAll('main *')].filter((element) =>
        element.shadowRoot?.textContent?.includes('In the app')
      );
      expect(hosts).toHaveLength(1);
    });
  });

  it('shows a load error in place and retries', async () => {
    let fail = true;
    const load: StudioApp['load'] = () =>
      fail
        ? Promise.reject(new Error('chunk missing'))
        : Promise.resolve({ default: Counter });
    render(<IsomerStudio {...{ runtime }} apps={[deck(load)]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));

    expect(
      await screen.findByText('Deck could not load or render')
    ).toBeInTheDocument();
    expect(screen.getByText('chunk missing')).toBeInTheDocument();

    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await countText()).toHaveTextContent('count 0');
  });
});
