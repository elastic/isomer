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
  findEditor,
  framedRuntime,
  renderStudio,
  runtime,
} from './fixtures/studio_harness';
import { IsomerStudio } from './studio';
import type { RasterizePng } from './types';

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

  it('shows every surface by default, one when picked, and several to compare', async () => {
    await renderStudio();
    expect(
      screen.queryByText(/^All \d+ outputs from the same props\./)
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Text preview' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Web preview' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Outputs:/ }));
    expect(screen.queryByRole('option', { name: 'All surfaces' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'React' })).toBeNull();
    expect(screen.queryByRole('option', { name: 'Snapshot' })).toBeNull();
    fireEvent.click(
      await screen.findByRole('option', { name: 'Web', checked: true })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Text preview' })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('region', { name: 'Web preview' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Text' }));
    expect(
      screen.getByRole('region', { name: 'Text preview' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Outputs: Web, Text' })
    ).toBeInTheDocument();

    for (const option of screen.getAllByRole('option', { checked: false })) {
      fireEvent.click(option);
    }
    expect(
      screen.queryByText(/^All \d+ outputs from the same props\./)
    ).not.toBeInTheDocument();
  });

  it('picks examples from rendered previews', async () => {
    window.location.hash = '#/dev/callout/0';
    await renderStudio();
    fireEvent.click(
      screen.getByRole('button', { name: /^Example: Example 1/ })
    );
    fireEvent.click(await screen.findByRole('button', { name: /^Example 2/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/dev/callout/1'));
  });

  it('puts the example picker ahead of the surface menu and lets readers switch to example source', async () => {
    await renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Reference' }));
    const examples = await screen.findByRole('region', { name: 'Examples' });
    const examplePicker = within(examples).getByRole('button', {
      name: /^Example:/,
    });
    const surface = within(examples).getByRole('button', { name: /^Outputs:/ });
    expect(
      examplePicker.compareDocumentPosition(surface) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    const viewToggle = within(examples).getByRole('group', {
      name: 'Example view',
    });
    expect(
      within(viewToggle).getByRole('button', { name: 'Example source' })
    ).toBeInTheDocument();
    expect(
      within(examples).queryByText('Live React, styled by the host.')
    ).not.toBeInTheDocument();
    expect(within(examples).queryByRole('tabpanel')).not.toBeInTheDocument();
    fireEvent.click(
      within(viewToggle).getByRole('button', { name: 'Example source' })
    );
    expect(within(examples).getByRole('tabpanel')).toHaveTextContent(
      '<Callout'
    );
    fireEvent.click(within(examples).getByRole('tab', { name: 'JSON' }));
    expect(within(examples).getByRole('tabpanel')).toHaveTextContent(
      '"type": "callout"'
    );

    fireEvent.click(
      within(viewToggle).getByRole('button', { name: 'Rendered' })
    );
    expect(within(examples).queryByRole('tabpanel')).not.toBeInTheDocument();
    fireEvent.click(
      within(viewToggle).getByRole('button', { name: 'Example source' })
    );
    expect(
      within(examples).getByRole('tab', { name: 'JSON', selected: true })
    ).toBeInTheDocument();
  });

  describe('PNG preview', () => {
    beforeEach(() => {
      if (!Object.hasOwn(URL, 'revokeObjectURL')) {
        Object.defineProperty(URL, 'revokeObjectURL', { value: () => {} });
      }
    });

    it('shows the host rasterization beneath the snapshot surface', async () => {
      const rasterizePng = vi
        .fn<RasterizePng>()
        .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
      render(<IsomerStudio runtime={framedRuntime} {...{ rasterizePng }} />);

      expect(await screen.findByAltText('PNG preview')).toBeInTheDocument();
      const [composition, options] = rasterizePng.mock.lastCall ?? [];
      expect(composition).toMatchObject({ type: 'view' });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
    });

    it('reports a failed rasterization', async () => {
      const rasterizePng = vi
        .fn()
        .mockRejectedValue(new Error('No takumi here.'));
      render(<IsomerStudio runtime={framedRuntime} {...{ rasterizePng }} />);

      expect(await screen.findByText('No takumi here.')).toBeInTheDocument();
    });

    it('falls back to every surface when the picked one goes away', async () => {
      const rasterizePng = vi
        .fn<RasterizePng>()
        .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
      const { rerender } = render(
        <IsomerStudio runtime={framedRuntime} {...{ rasterizePng }} />
      );
      await findEditor();
      fireEvent.click(screen.getByRole('button', { name: /^Outputs:/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'PNG' }));
      expect(await screen.findByAltText('PNG preview')).toBeInTheDocument();

      rerender(<IsomerStudio runtime={framedRuntime} />);
      expect(
        screen.getByRole('button', { name: /^Outputs: \d+ outputs$/ })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'Web preview' })
      ).toBeInTheDocument();
    });

    it('is absent when the runtime has no snapshot surface', async () => {
      const rasterizePng = vi.fn<RasterizePng>();
      render(<IsomerStudio {...{ runtime, rasterizePng }} />);
      await findEditor();

      expect(
        screen.getByRole('region', { name: 'Web preview' })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'Snapshot preview' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('region', { name: 'PNG preview' })
      ).not.toBeInTheDocument();
      expect(rasterizePng).not.toHaveBeenCalled();
    });

    it('is absent without a rasterizer', async () => {
      render(<IsomerStudio runtime={framedRuntime} />);
      await findEditor();

      expect(
        screen.queryByRole('region', { name: 'PNG preview' })
      ).not.toBeInTheDocument();
    });
  });
});
