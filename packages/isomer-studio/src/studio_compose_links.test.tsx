/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import {
  findComposer,
  openLink,
  renderStudio,
  runtime,
  textPreview,
  transformJsx,
  workbench,
} from './fixtures/studio_harness';
import { encodeGate } from './fixtures/studio_mocks';
import { IsomerStudio } from './studio';

vi.mock('./model/compile_jsx', async (importOriginal) =>
  (await import('./fixtures/studio_mocks')).mockCompileJsx(
    await importOriginal<typeof import('./model/compile_jsx')>()
  )
);

vi.mock('./model/compose_link', async (importOriginal) =>
  (await import('./fixtures/studio_mocks')).mockComposeLink(
    await importOriginal<typeof import('./model/compose_link')>()
  )
);

vi.mock('./dev/monaco_editor', async () =>
  (await import('./fixtures/studio_mocks')).mockMonacoEditor()
);

describe('IsomerStudio', () => {
  beforeEach(() => {
    window.location.hash = '#/dev';
  });

  describe('composition editor', () => {
    beforeEach(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    it('opens from the nav above Gallery with a starter, and keeps the URL in step', async () => {
      await renderStudio();
      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Composition' }));

      const editor = await findComposer();
      expect(
        within(nav).getByRole('button', { name: 'Composition' })
      ).toHaveAttribute('aria-current', 'page');
      expect(JSON.parse(editor.value)).toMatchObject({
        type: 'view',
        body: [{ type: 'callout' }],
      });
      expect(workbench().getByText('Valid')).toBeInTheDocument();
      await waitFor(() =>
        expect(window.location.hash).toMatch(
          /^#\/compose\?code=[\w-]+&lang=json$/
        )
      );
    });

    it('loads a JSON composition from a link and renders it at once', async () => {
      const source = JSON.stringify({
        type: 'view',
        title: 'Linked',
        body: [{ type: 'callout', body: 'From a link.' }],
      });
      await openLink(source, 'json');
      render(<IsomerStudio {...{ runtime }} />);

      expect(await findComposer()).toHaveValue(source);
      await waitFor(() =>
        expect(textPreview()).toHaveTextContent('From a link.')
      );
      expect(workbench().getByText('Valid')).toBeInTheDocument();
    });

    it('holds linked JSX until the reader runs it', async () => {
      const source =
        '<Composition title="Linked">\n  <Callout>Ran.</Callout>\n</Composition>';
      await openLink(source, 'jsx');
      render(<IsomerStudio {...{ runtime, transformJsx }} />);

      expect(await findComposer()).toHaveValue(source);
      expect(workbench().getByText('Not run')).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Text preview' })
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Run this code' }));
      await waitFor(() => expect(textPreview()).toHaveTextContent('Ran.'));
      expect(workbench().getByText('Valid')).toBeInTheDocument();
    });

    it('reports a link it cannot read and starts from the starter', async () => {
      window.location.hash = '#/compose?code=!!!';
      render(<IsomerStudio {...{ runtime }} />);

      expect(
        await screen.findByText('The link did not load')
      ).toBeInTheDocument();
      expect((await findComposer()).value).toContain('"callout"');
    });

    it('starts from a primitive example named in the link', async () => {
      window.location.hash = '#/compose?example=divider/0';
      render(<IsomerStudio {...{ runtime }} />);

      await waitFor(async () =>
        expect((await findComposer()).value).toContain('"divider"')
      );
    });

    it('loads a slow src link into a composer that is already mounted', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Divider' }));

      const linked = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Slow.' }],
      });
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) =>
              setTimeout(() => resolve(new Response(linked)), 1_000)
            )
        )
      );
      try {
        window.location.hash =
          '#/compose?src=https%3A%2F%2Fexample.com%2Fa.json';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        await waitFor(
          async () => expect(await findComposer()).toHaveValue(linked),
          { timeout: 5_000 }
        );
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('resumes syncing when a slow src link is cancelled', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      vi.stubGlobal(
        'fetch',
        vi.fn(
          (_url: unknown, { signal }: RequestInit = {}) =>
            new Promise<Response>((_resolve, reject) =>
              signal?.addEventListener('abort', () =>
                reject(new DOMException('Aborted', 'AbortError'))
              )
            )
        )
      );
      try {
        window.location.hash =
          '#/compose?src=https%3A%2F%2Fexample.com%2Fslow.json';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(await screen.findByText('Loading…')).toBeInTheDocument();

        window.location.hash = '#/compose';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        await waitFor(() =>
          expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
        );

        const draft = JSON.stringify({
          type: 'view',
          body: [{ type: 'callout', body: 'After cancel.' }],
        });
        fireEvent.change(await findComposer(), { target: { value: draft } });
        await waitFor(
          () =>
            expect(
              localStorage.getItem('isomer-studio:composition-draft')
            ).toContain('After cancel.'),
          { timeout: 5_000 }
        );
        await waitFor(
          () => expect(window.location.hash).toMatch(/^#\/compose\?code=/),
          { timeout: 5_000 }
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('shows that a src link is loading before the editor appears', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn(() => new Promise<Response>(() => undefined))
      );
      try {
        window.location.hash =
          '#/compose?src=https%3A%2F%2Fexample.com%2Fslow.json';
        render(<IsomerStudio {...{ runtime }} />);
        expect(
          await screen.findByText('Loading the linked composition…')
        ).toBeInTheDocument();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('cancels a loading src link when New starts the starter', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      let land: (response: Response) => void = () => undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              land = resolve;
            })
        )
      );
      try {
        window.location.hash =
          '#/compose?src=https%3A%2F%2Fexample.com%2Flate.json';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(await screen.findByText('Loading…')).toBeInTheDocument();

        fireEvent.click(
          screen.getByRole('button', { name: 'New composition' })
        );
        fireEvent.click(
          await screen.findByRole('option', { name: /^Starter/ })
        );
        const starter = (await findComposer()).value;
        land(
          new Response(
            JSON.stringify({
              type: 'view',
              body: [{ type: 'callout', body: 'Late.' }],
            })
          )
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(await findComposer()).toHaveValue(starter);
        expect(screen.queryByText('Loading…')).not.toBeInTheDocument();
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('keeps the saved draft when a link fails to load', async () => {
      const saved = {
        source: JSON.stringify({
          type: 'view',
          body: [{ type: 'callout', body: 'Saved.' }],
        }),
        format: 'json',
      };
      localStorage.setItem(
        'isomer-studio:composition-draft',
        JSON.stringify(saved)
      );
      window.location.hash = '#/compose?code=!!!';
      render(<IsomerStudio {...{ runtime }} />);

      expect(
        await screen.findByText('The link did not load')
      ).toBeInTheDocument();
      expect(await findComposer()).toHaveValue(saved.source);
      await new Promise((resolve) => setTimeout(resolve, 600));
      expect(
        JSON.parse(
          localStorage.getItem('isomer-studio:composition-draft') ?? ''
        )
      ).toEqual(saved);
    });

    it('drops an encode a newer link load supersedes', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      await waitFor(() => expect(window.location.hash).toMatch(/code=/), {
        timeout: 5_000,
      });

      let release: () => void = () => undefined;
      encodeGate.current = new Promise((resolve) => {
        release = resolve;
      });
      const linked = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Linked.' }],
      });
      let land: (response: Response) => void = () => undefined;
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              land = resolve;
            })
        )
      );
      try {
        fireEvent.change(await findComposer(), {
          target: {
            value: JSON.stringify({
              type: 'view',
              body: [{ type: 'callout', body: 'Stale.' }],
            }),
          },
        });
        await new Promise((resolve) => setTimeout(resolve, 600));

        window.location.hash =
          '#/compose?src=https%3A%2F%2Fexample.com%2Flinked.json';
        window.dispatchEvent(new HashChangeEvent('hashchange'));
        expect(await screen.findByText('Loading…')).toBeInTheDocument();

        encodeGate.current = undefined;
        release();
        await new Promise((resolve) => setTimeout(resolve, 50));
        land(new Response(linked));

        await waitFor(
          async () => expect(await findComposer()).toHaveValue(linked),
          { timeout: 5_000 }
        );
      } finally {
        encodeGate.current = undefined;
        vi.unstubAllGlobals();
      }
    });
  });
});
