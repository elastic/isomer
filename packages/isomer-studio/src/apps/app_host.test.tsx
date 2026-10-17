/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

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

const OtherCounter = (props: StudioAppProps) => <Counter {...props} />;

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
    window.location.hash = '#/dev';
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

  it('opens an app at a page picked from the nav, and keeps the page current below it', async () => {
    render(
      <IsomerStudio
        {...{ runtime }}
        apps={[
          {
            ...deck(sameLoad()),
            pages: [{ path: 'slides', title: 'Slides', section: 'Decks' }],
          },
        ]}
      />
    );
    const pages = screen.getByRole('list', { name: 'Deck pages' });
    fireEvent.click(within(pages).getByRole('button', { name: 'Slides' }));

    expect(await countText()).toHaveTextContent('path "slides"');
    expect(window.location.hash).toBe('#/app/deck/slides');

    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(await countText()).toHaveTextContent('path "slides/2"');
    expect(
      within(pages).getByRole('button', { name: 'Slides' })
    ).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Deck' })).not.toHaveAttribute(
      'aria-current'
    );
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

  it('keeps app state across a theme change and a config re-run, and resets it when the page changes', async () => {
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
        apps={[deck(() => Promise.resolve({ default: OtherCounter }))]}
      />
    );
    await waitFor(() =>
      expect(screen.getByText(/^count/)).toHaveTextContent('count 0')
    );
  });

  it('follows the module a loader resolves, even when its source is unchanged', async () => {
    const pages: Record<string, StudioApp['load']> = {
      first: () => Promise.resolve({ default: () => <p>First page</p> }),
      second: () => Promise.resolve({ default: () => <p>Second page</p> }),
    };
    const loaderFor =
      (choice: string): StudioApp['load'] =>
      () =>
        pages[choice]?.() ?? Promise.reject(new Error(choice));
    const { rerender } = render(
      <IsomerStudio {...{ runtime }} apps={[deck(loaderFor('first'))]} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));
    expect(await screen.findByText('First page')).toBeInTheDocument();

    rerender(
      <IsomerStudio {...{ runtime }} apps={[deck(loaderFor('second'))]} />
    );
    expect(await screen.findByText('Second page')).toBeInTheDocument();
  });

  it('goes Home and rewrites the hash when the open app goes away', async () => {
    const { rerender } = render(
      <IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />
    );
    await openDeck();

    rerender(<IsomerStudio {...{ runtime }} apps={[]} />);

    await waitFor(() => expect(window.location.hash).toBe('#/home'));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What are we rendering today?',
      })
    ).toBeInTheDocument();
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

  it("hands an app the runtime's surfaces, a `Surface` that shows one, and the host's `renderPdf`", async () => {
    const renderPdf = vi.fn(() => Promise.resolve(new Blob()));
    const Outputs = ({
      Surface,
      surfaces,
      renderPdf: given,
    }: StudioAppProps) => (
      <div>
        <p>{`surfaces ${surfaces.map(({ id }) => id).join(' ')}`}</p>
        <p>{`pdf ${String(given === renderPdf)}`}</p>
        <Surface
          composition={{ type: 'view', title: 'Dropped', body: [inApp] }}
          surface="markdown"
          heading={false}
        />
      </div>
    );
    render(
      <IsomerStudio
        {...{ runtime, renderPdf }}
        apps={[deck(() => Promise.resolve({ default: Outputs }))]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));

    expect(await screen.findByText(/^surfaces/)).toHaveTextContent(
      'surfaces react html slack markdown text'
    );
    expect(screen.getByText(/^pdf/)).toHaveTextContent('pdf true');
    expect(await screen.findByText(/In the app/)).toBeInTheDocument();
    expect(screen.queryByText(/Dropped/)).toBeNull();
  });

  it('shows an error from a loader that throws before returning a promise', async () => {
    const load: StudioApp['load'] = () => {
      throw new Error('thrown synchronously');
    };
    render(<IsomerStudio {...{ runtime }} apps={[deck(load)]} />);
    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));

    expect(
      await screen.findByText('Deck could not load or render')
    ).toBeInTheDocument();
    expect(screen.getByText('thrown synchronously')).toBeInTheDocument();
  });

  it('renders a replacement page after the previous one threw', async () => {
    const Broken = (): never => {
      throw new Error('render failed');
    };
    const { rerender } = render(
      <IsomerStudio
        {...{ runtime }}
        apps={[deck(() => Promise.resolve({ default: Broken }))]}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Deck' }));
    expect(await screen.findByText('render failed')).toBeInTheDocument();

    rerender(<IsomerStudio {...{ runtime }} apps={[deck(sameLoad())]} />);
    expect(await countText()).toHaveTextContent('count 0');
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
