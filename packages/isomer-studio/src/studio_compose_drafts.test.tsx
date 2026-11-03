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
  findEditor,
  openLink,
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

    it('carries a Workbench draft over, and runs JSX this tab wrote', async () => {
      render(<IsomerStudio {...{ runtime, transformJsx }} />);
      fireEvent.change(await findEditor(), {
        target: {
          value: '<Composition>\n  <Callout>Carried.</Callout>\n</Composition>',
        },
      });
      await waitFor(() => expect(textPreview()).toHaveTextContent('Carried.'));
      fireEvent.click(
        screen.getByRole('button', { name: 'Open in the composition editor' })
      );

      expect(await findComposer()).toHaveValue(
        '<Composition>\n  <Callout>Carried.</Callout>\n</Composition>'
      );
      expect(workbench().queryByText('Not run')).not.toBeInTheDocument();
      expect(window.location.hash).toMatch(/^#\/compose\?code=/);
    });

    it('keeps the latest draft, not the opening link, across Home', async () => {
      await openLink(
        JSON.stringify({
          type: 'view',
          body: [{ type: 'callout', body: 'Old.' }],
        }),
        'json'
      );
      render(<IsomerStudio {...{ runtime }} />);
      const draft = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'New.' }],
      });
      const editor = await findComposer();
      const linked = window.location.hash;
      fireEvent.change(editor, { target: { value: draft } });
      await waitFor(() => expect(textPreview()).toHaveTextContent('New.'));
      await waitFor(() => expect(window.location.hash).not.toBe(linked), {
        timeout: 5_000,
      });

      fireEvent.click(screen.getByRole('link', { name: 'Isomer Studio home' }));
      fireEvent.click(
        await screen.findByRole('link', { name: /Open the workbench/ })
      );
      await findEditor();
      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Composition' }));

      await waitFor(
        async () => expect(await findComposer()).toHaveValue(draft),
        { timeout: 5_000 }
      );
    });

    it('keeps an edit made just before going Home', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      await waitFor(() => expect(window.location.hash).toMatch(/code=/), {
        timeout: 5_000,
      });
      const draft = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Quick.' }],
      });
      fireEvent.change(await findComposer(), { target: { value: draft } });
      fireEvent.click(screen.getByRole('link', { name: 'Isomer Studio home' }));

      expect(localStorage.getItem('isomer-studio:composition-draft')).toContain(
        'Quick.'
      );
      fireEvent.click(
        await screen.findByRole('link', { name: /Open the workbench/ })
      );
      await findEditor();
      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Composition' }));
      await waitFor(
        async () => expect(await findComposer()).toHaveValue(draft),
        { timeout: 5_000 }
      );
    });

    it('keeps a draft too large for a link at a bare #/compose that reloads it', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      const draft = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'x'.repeat(1_000_001) }],
      });
      fireEvent.change(await findComposer(), { target: { value: draft } });
      await waitFor(
        () =>
          expect(
            localStorage.getItem('isomer-studio:composition-draft')
          ).toContain('xxxx'),
        { timeout: 5_000 }
      );
      await waitFor(() => expect(window.location.hash).toBe('#/compose'));
    });

    it('keeps the shared URL when the active Composition item is clicked', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      await waitFor(() => expect(window.location.hash).toMatch(/code=/), {
        timeout: 5_000,
      });
      const shared = window.location.hash;

      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Composition' }));
      expect(window.location.hash).toBe(shared);
    });

    it('warns and keeps the link when an oversized draft cannot be saved', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      await findComposer();
      await waitFor(() => expect(window.location.hash).toMatch(/code=/), {
        timeout: 5_000,
      });
      const linked = window.location.hash;
      const setItem = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new DOMException('Full', 'QuotaExceededError');
        });
      try {
        fireEvent.change(await findComposer(), {
          target: {
            value: JSON.stringify({
              type: 'view',
              body: [{ type: 'callout', body: 'x'.repeat(1_000_001) }],
            }),
          },
        });
        expect(
          await screen.findByText('This draft is not saved', undefined, {
            timeout: 5_000,
          })
        ).toBeInTheDocument();
        expect(window.location.hash).toBe(linked);
      } finally {
        setItem.mockRestore();
      }
    });

    it('reports a JSX body that is not an array of nodes', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime, transformJsx }} />);
      await findComposer();
      fireEvent.click(screen.getByRole('button', { name: 'JSX' }));
      fireEvent.change(await findComposer(), {
        target: { value: '<Composition body={{}} />' },
      });
      expect(await screen.findByText('JSX error')).toBeInTheDocument();
      expect(
        screen.getByText(/Expected `body` to be an array of nodes/)
      ).toBeInTheDocument();
    });

    it('restores the saved edit and drops its encode when the composer unmounts mid-encode', async () => {
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
      const stale = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Stale.' }],
      });
      const fresh = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Fresh.' }],
      });
      try {
        fireEvent.change(await findComposer(), { target: { value: stale } });
        await new Promise((resolve) => setTimeout(resolve, 600));

        fireEvent.click(
          screen.getByRole('link', { name: 'Isomer Studio home' })
        );
        fireEvent.click(
          await screen.findByRole('link', { name: /Open the workbench/ })
        );
        await findEditor();
        const nav = screen.getByRole('navigation', { name: 'Primitives' });
        fireEvent.click(
          within(nav).getByRole('button', { name: 'Composition' })
        );
        // The edit saved while its encode was still pending comes back, not the older link.
        await waitFor(
          async () => expect(await findComposer()).toHaveValue(stale),
          { timeout: 5_000 }
        );
        fireEvent.change(await findComposer(), { target: { value: fresh } });

        encodeGate.current = undefined;
        release();
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(await findComposer()).toHaveValue(fresh);
        await waitFor(
          () =>
            expect(
              localStorage.getItem('isomer-studio:composition-draft')
            ).toContain('Fresh.'),
          { timeout: 5_000 }
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        expect(await findComposer()).toHaveValue(fresh);
      } finally {
        encodeGate.current = undefined;
      }
    });

    it('keeps its draft while another page shows', async () => {
      window.location.hash = '#/compose';
      render(<IsomerStudio {...{ runtime }} />);
      const draft = JSON.stringify({
        type: 'view',
        body: [{ type: 'callout', body: 'Kept.' }],
      });
      fireEvent.change(await findComposer(), { target: { value: draft } });

      const nav = screen.getByRole('navigation', { name: 'Primitives' });
      fireEvent.click(within(nav).getByRole('button', { name: 'Divider' }));
      fireEvent.click(within(nav).getByRole('button', { name: 'Composition' }));

      expect(await findComposer()).toHaveValue(draft);
    });
  });
});
