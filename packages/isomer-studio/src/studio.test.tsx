/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitivePack } from '@elastic/isomer-sdk';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';

import type { StudioCompose } from './config';
import {
  componentsPack,
  componentsPrimitives,
} from './fixtures/components_pack';
import { defaultCompose } from './model/compose_example';
import { IsomerStudio } from './studio';
import type { RasterizePng } from './types';

vi.mock('./dev/monaco_editor', async () => {
  const { createElement } =
    await vi.importActual<typeof import('react')>('react');
  return {
    MonacoEditor: ({
      value,
      onChange,
      ariaLabel,
    }: {
      value: string;
      onChange: (value: string) => void;
      ariaLabel: string;
    }) =>
      createElement('textarea', {
        'aria-label': ariaLabel,
        value,
        onChange: ({ target }: { target: HTMLTextAreaElement }) =>
          onChange(target.value),
      }),
  };
});

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const framedRuntime = createIsomerRuntime<
  unknown,
  StyledRenderContext,
  unknown
>({
  packs: [componentsPack],
  frames: {
    card: {
      defaultWidth: 320,
      theme: { light: undefined, dark: undefined },
      estimateHeight: () => 100,
      wrap: (_header, body) => <div>{body}</div>,
    },
  },
});

const findEditor = () =>
  screen.findByRole('textbox', { name: 'Callout source' });

const renderStudio = async () => {
  render(<IsomerStudio {...{ runtime }} />);
  return findEditor();
};

describe('IsomerStudio', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('lists the runtime primitives under their groups, narrowed by the filter', async () => {
    await renderStudio();
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    const headings = () =>
      within(nav)
        .getAllByRole('heading')
        .map(({ textContent }) => textContent);
    const labels = () =>
      within(nav)
        .getAllByRole('listitem')
        .map(({ textContent }) => textContent);
    expect(headings()).toEqual(['Narrative and content', 'Data display']);
    expect(labels()).toEqual(['Callout', 'Divider', 'Health', 'Stat group']);
    expect(
      within(nav).getByRole('button', { current: 'page' })
    ).toHaveTextContent('Callout');

    fireEvent.change(
      within(nav).getByRole('searchbox', { name: 'Filter primitives' }),
      { target: { value: 'statGroup' } }
    );
    expect(headings()).toEqual(['Data display']);
    expect(labels()).toEqual(['Stat group']);
  });

  it('heads each pack when the runtime has more than one', async () => {
    window.localStorage.removeItem('isomer-studio:nav-closed-groups');
    const [callout, divider, health, statGroup] = componentsPrimitives;
    const twoPacks = createIsomerRuntime<unknown, StyledRenderContext>({
      packs: [
        definePrimitivePack({
          id: 'narrative',
          primitives: [callout, divider],
          authoring: {
            groups: [
              {
                title: 'Narrative and content',
                types: ['callout', 'divider'],
              },
            ],
          },
        }),
        definePrimitivePack({
          id: 'metrics',
          primitives: [health, statGroup],
          authoring: {
            groups: [{ title: 'Data display', types: ['health', 'statGroup'] }],
          },
        }),
      ],
    });
    render(<IsomerStudio runtime={twoPacks} />);
    await findEditor();
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    const headings = () =>
      within(nav)
        .getAllByRole('heading')
        .map(({ textContent }) => textContent);
    expect(headings()).toEqual([
      'Narrative',
      'Narrative and content',
      'Metrics',
      'Data display',
    ]);

    fireEvent.click(within(nav).getByRole('button', { name: 'Data display' }));
    expect(window.localStorage.getItem('isomer-studio:nav-closed-groups')).toBe(
      '["metrics/Data display"]'
    );
    fireEvent.change(
      within(nav).getByRole('searchbox', { name: 'Filter primitives' }),
      { target: { value: 'statGroup' } }
    );
    expect(headings()).toEqual(['Metrics', 'Data display']);
  });

  it('remembers a closed group, and opens it while filtering', async () => {
    window.localStorage.removeItem('isomer-studio:nav-closed-groups');
    await renderStudio();
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    const toggle = () =>
      within(nav).getByRole('button', { name: 'Data display' });
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(window.localStorage.getItem('isomer-studio:nav-closed-groups')).toBe(
      '["Data display"]'
    );

    const filter = within(nav).getByRole('searchbox', {
      name: 'Filter primitives',
    });
    fireEvent.change(filter, { target: { value: 'health' } });
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.change(filter, { target: { value: '' } });
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
  });

  it("shows a primitive's purpose after the pointer rests on it", async () => {
    window.localStorage.removeItem('isomer-studio:nav-closed-groups');
    await renderStudio();
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    const divider = within(nav).getByText('Divider');
    const { purpose = '' } =
      runtime
        .getAuthoringContext()
        .primitives.find(({ type }) => type === 'divider') ?? {};

    fireEvent.mouseEnter(divider);
    expect(screen.queryByText(purpose)).not.toBeInTheDocument();
    expect(await screen.findByText(purpose)).toBeInTheDocument();

    fireEvent.mouseLeave(divider);
    await waitFor(() =>
      expect(screen.queryByText(purpose)).not.toBeInTheDocument()
    );
  });

  it('remembers the color mode, defaulting to the system', async () => {
    window.localStorage.removeItem('isomer-studio:color-mode');
    await renderStudio();
    const mode = (name: string) => screen.getByRole('button', { name });
    expect(mode('System')).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(mode('Dark'));
    expect(mode('Dark')).toHaveAttribute('aria-pressed', 'true');
    expect(window.localStorage.getItem('isomer-studio:color-mode')).toBe(
      'dark'
    );
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

  it('switches between Dev and Docs', async () => {
    expect(await renderStudio()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Docs' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Callout' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Guidance' })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/docs/callout/0');

    fireEvent.click(screen.getByRole('button', { name: 'Dev' }));
    expect(await findEditor()).toBeInTheDocument();
  });

  it('edits JSON when the host supplies no JSX transform, and reports invalid nodes', async () => {
    const editor = await renderStudio();
    expect(screen.getByText('Valid')).toBeInTheDocument();

    fireEvent.change(editor, { target: { value: '{ "type": "callout",' } });
    expect(await screen.findByText('JSON error')).toBeInTheDocument();

    fireEvent.change(editor, {
      target: {
        value: JSON.stringify({ type: 'callout', tone: 'bogus', body: 'Hi.' }),
      },
    });
    await waitFor(() =>
      expect(screen.getByText(/^Invalid/)).toBeInTheDocument()
    );
    expect(screen.getByText(/must be one of/)).toBeInTheDocument();
  });

  it('carries an edit still being parsed into the format switched to', async () => {
    const transformJsx = () => Promise.reject(new Error('Not compiled.'));
    render(<IsomerStudio {...{ runtime, transformJsx }} />);
    await findEditor();
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));

    fireEvent.change(await findEditor(), {
      target: { value: JSON.stringify({ type: 'callout', body: 'Edited.' }) },
    });
    fireEvent.click(screen.getByRole('button', { name: 'JSX' }));

    await waitFor(async () =>
      expect(await findEditor()).toHaveValue(
        '<Composition>\n  <Callout>Edited.</Callout>\n</Composition>'
      )
    );
  });

  it('reports a body the host composer rejects as a parse error', async () => {
    const compose: StudioCompose = (nodes, options) => {
      if (nodes.some((node) => 'body' in node && node.body === 'Boom.')) {
        throw new Error('The composer refused this body.');
      }
      return defaultCompose(nodes, options);
    };
    render(<IsomerStudio {...{ runtime, compose }} />);
    const editor = await findEditor();

    fireEvent.change(editor, {
      target: { value: JSON.stringify({ type: 'callout', body: 'Boom.' }) },
    });
    expect(await screen.findByText('JSON error')).toBeInTheDocument();
    expect(
      screen.getByText(/The composer refused this body\./)
    ).toBeInTheDocument();
    expect(editor).toBeInTheDocument();
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

      expect(
        await screen.findByRole('img', { name: 'PNG preview' })
      ).toBeInTheDocument();
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

    it('is absent when the runtime has no snapshot surface', async () => {
      const rasterizePng = vi.fn<RasterizePng>();
      render(<IsomerStudio {...{ runtime, rasterizePng }} />);
      await findEditor();

      expect(
        screen.getByRole('region', { name: 'HTML preview' })
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
