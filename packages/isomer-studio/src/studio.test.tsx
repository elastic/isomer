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
import ts from 'typescript';
import { runInNewContext } from 'vm';

import type { StudioCompose } from './config';
import {
  componentsPack,
  componentsPrimitives,
} from './fixtures/components_pack';
import type { CompiledEvaluator } from './model/compile_jsx';
import { defaultCompose } from './model/compose_example';
import { JSX_TRANSFORM_OPTIONS } from './model/jsx_transform';
import { IsomerStudio } from './studio';
import type { JsxTransform, RasterizePng } from './types';

vi.mock('./model/compile_jsx', async () => {
  const actual = await vi.importActual<typeof import('./model/compile_jsx')>(
    './model/compile_jsx'
  );
  const evaluate: CompiledEvaluator = (code, scope) => {
    const context: Record<string, unknown> = { ...scope };
    runInNewContext(code, context);
    return context[actual.COMPILED_RESULT];
  };
  return {
    ...actual,
    compileCompositionJsx: (
      ...[source, shim, transformJsx]: Parameters<
        typeof actual.compileCompositionJsx
      >
    ) => actual.compileCompositionJsx(source, shim, transformJsx, { evaluate }),
  };
});

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

const transformJsx: JsxTransform = (source) =>
  Promise.resolve(
    ts.transpileModule(source, {
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        jsxFactory: JSX_TRANSFORM_OPTIONS.jsxFactory,
        jsxFragmentFactory: JSX_TRANSFORM_OPTIONS.jsxFragment,
      },
      fileName: 'composition.jsx',
    }).outputText
  );

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

  it('offers light, dark, and system, and remembers the choice', async () => {
    window.localStorage.removeItem('isomer-studio:color-mode');
    await renderStudio();
    expect(window.localStorage.getItem('isomer-studio:color-mode')).toBe(
      'system'
    );
    expect(screen.getByRole('button', { name: 'System' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Dark' }));
    expect(screen.getByRole('button', { name: 'Dark' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(window.localStorage.getItem('isomer-studio:color-mode')).toBe(
      'dark'
    );

    fireEvent.click(screen.getByRole('button', { name: 'System' }));
    expect(window.localStorage.getItem('isomer-studio:color-mode')).toBe(
      'system'
    );
  });

  it('shows every surface by default, one when picked, and several to compare', async () => {
    await renderStudio();
    expect(
      screen.getByText(/^All \d+ surfaces from the same props\./)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Text preview' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'HTML preview' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Surface/ }));
    fireEvent.click(await screen.findByRole('option', { name: 'HTML' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('region', { name: 'Text preview' })
      ).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('region', { name: 'HTML preview' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Text' }));
    expect(
      screen.getByRole('region', { name: 'Text preview' })
    ).toBeInTheDocument();
    expect(screen.getByText(/^Comparing 2 surfaces/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'All surfaces' }));
    expect(
      screen.getByText(/^All \d+ surfaces from the same props\./)
    ).toBeInTheDocument();
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

  it('puts the example picker ahead of the surface menu and shows the example source', async () => {
    await renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Docs' }));
    const examples = await screen.findByRole('region', { name: 'Examples' });
    const examplePicker = within(examples).getByRole('button', {
      name: /^Example:/,
    });
    const surface = within(examples).getByRole('button', { name: /^Surface/ });
    expect(
      examplePicker.compareDocumentPosition(surface) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();

    expect(within(examples).getByRole('tabpanel')).toHaveTextContent(
      '<Callout'
    );
    fireEvent.click(within(examples).getByRole('tab', { name: 'JSON' }));
    expect(within(examples).getByRole('tabpanel')).toHaveTextContent(
      '"type": "callout"'
    );

    fireEvent.click(
      within(examples).getByRole('button', { name: 'Hide source' })
    );
    expect(within(examples).queryByRole('tabpanel')).not.toBeInTheDocument();
    fireEvent.click(
      within(examples).getByRole('button', { name: 'View source' })
    );
    expect(
      within(examples).getByRole('tab', { name: 'JSON', selected: true })
    ).toBeInTheDocument();
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

  it('compiles edited JSX into the preview and validates it', async () => {
    render(<IsomerStudio {...{ runtime, transformJsx }} />);
    const editor = await findEditor();

    fireEvent.change(editor, {
      target: {
        value: '<Composition>\n  <Callout>Compiled.</Callout>\n</Composition>',
      },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Text preview' })
      ).toHaveTextContent('Compiled.')
    );
    expect(screen.getByText('Valid')).toBeInTheDocument();

    fireEvent.change(editor, {
      target: {
        value:
          '<Composition>\n  <Callout tone="bogus">Compiled.</Callout>\n</Composition>',
      },
    });
    expect(await screen.findByText('Invalid · 1 error')).toBeInTheDocument();
    expect(screen.getByText(/must be one of/)).toBeInTheDocument();
  });

  it('keeps a draft that does not parse when the format is switched', async () => {
    render(<IsomerStudio {...{ runtime, transformJsx }} />);
    await findEditor();
    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));
    const draft = '{ "type": "callout",';
    fireEvent.change(await findEditor(), { target: { value: draft } });
    expect(await screen.findByText('JSON error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'JSX' }));
    await waitFor(() =>
      expect(screen.getByText('JSON error')).toBeInTheDocument()
    );
    expect(await findEditor()).toHaveValue(draft);
  });

  it('applies a quick edit to the draft, and keeps a draft that does not parse', async () => {
    const editor = await renderStudio();
    const pickTone = async (tone: string) => {
      fireEvent.click(screen.getByRole('button', { name: '+ Prop' }));
      fireEvent.click(await screen.findByRole('menuitem', { name: /^tone:/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: tone }));
    };

    fireEvent.change(editor, {
      target: { value: JSON.stringify({ type: 'callout', body: 'Drafted.' }) },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Text preview' })
      ).toHaveTextContent('Drafted.')
    );
    await pickTone('danger');
    await waitFor(() =>
      expect(JSON.parse((editor as HTMLTextAreaElement).value)).toEqual({
        type: 'callout',
        body: 'Drafted.',
        tone: 'danger',
      })
    );

    const draft = '{ "type": "callout",';
    fireEvent.change(editor, { target: { value: draft } });
    expect(await screen.findByText('JSON error')).toBeInTheDocument();
    await pickTone('success');
    await waitFor(() =>
      expect(screen.getByText('JSON error')).toBeInTheDocument()
    );
    expect(editor).toHaveValue(draft);
  });

  it('reports a quick edit the host composer rejects', async () => {
    const compose: StudioCompose = (nodes, options) => {
      if (nodes.some((node) => 'tone' in node && node.tone === 'danger')) {
        throw new Error('The composer refused this tone.');
      }
      return defaultCompose(nodes, options);
    };
    render(<IsomerStudio {...{ runtime, compose }} />);
    const editor = await findEditor();
    const before = (editor as HTMLTextAreaElement).value;

    fireEvent.click(screen.getByRole('button', { name: '+ Prop' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /^tone:/ }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'danger' }));

    expect(
      await screen.findByText(/The composer refused this tone\./)
    ).toBeInTheDocument();
    expect(await findEditor()).toHaveValue(before);
  });

  it('keeps the Dev draft while Docs is open', async () => {
    const editor = await renderStudio();
    const draft = JSON.stringify({ type: 'callout', body: 'Kept.' });
    fireEvent.change(editor, { target: { value: draft } });

    fireEvent.click(screen.getByRole('button', { name: 'Docs' }));
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Divider' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'Callout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dev' }));

    expect(await findEditor()).toHaveValue(draft);
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
      fireEvent.click(screen.getByRole('button', { name: /Surface/ }));
      fireEvent.click(await screen.findByRole('option', { name: 'PNG' }));
      expect(
        await screen.findByText('The snapshot, rasterized by the host.')
      ).toBeInTheDocument();

      rerender(<IsomerStudio runtime={framedRuntime} />);
      expect(
        screen.getByText(/^All \d+ surfaces from the same props\./)
      ).toBeInTheDocument();
      expect(
        screen.getByRole('region', { name: 'HTML preview' })
      ).toBeInTheDocument();
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
