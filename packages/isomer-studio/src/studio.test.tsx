/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import type { DefaultPackTypes } from '@elastic/isomer-sdk';
import { definePrimitive, definePrimitivePack } from '@elastic/isomer-sdk';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import ts from 'typescript';
import { runInNewContext } from 'vm';
import { z } from 'zod';

import type { StudioCompose } from './config';
import {
  componentsPack,
  componentsPrimitives,
} from './fixtures/components_pack';
import type { CompiledEvaluator } from './model/compile_jsx';
import { defaultCompose } from './model/compose_example';
import { encodeSource } from './model/compose_link';
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
    compileCompositionDocumentJsx: (
      ...[source, shim, transformJsx]: Parameters<
        typeof actual.compileCompositionDocumentJsx
      >
    ) =>
      actual.compileCompositionDocumentJsx(source, shim, transformJsx, {
        evaluate,
      }),
  };
});

/** While set, `encodeSource` waits on it, so a test can hold an encode in flight. */
const encodeGate = vi.hoisted(() => ({
  current: undefined as Promise<void> | undefined,
}));

vi.mock('./model/compose_link', async () => {
  const actual = await vi.importActual<typeof import('./model/compose_link')>(
    './model/compose_link'
  );
  return {
    ...actual,
    encodeSource: async (source: string) => {
      const gate = encodeGate.current;
      if (gate) {
        await gate;
      }
      return actual.encodeSource(source);
    },
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
    window.location.hash = '#/dev';
  });

  it('opens Home on an empty hash, and returns to it from the mark', async () => {
    window.location.hash = '';
    render(<IsomerStudio {...{ runtime }} />);
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What are we rendering today?',
      })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Reference' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: 'Primitives' })
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: /Open the workbench/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/dev/callout/0'));
    expect(await findEditor()).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Reference' })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Isomer Studio home' }));
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'What are we rendering today?',
      })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/home');
  });

  it('opens a searched primitive from Home in the mode last used', async () => {
    window.location.hash = '#/docs/divider/0';
    render(<IsomerStudio {...{ runtime }} />);
    fireEvent.click(screen.getByRole('link', { name: 'Isomer Studio home' }));
    const search = await screen.findByLabelText('Search primitives');
    fireEvent.focus(search);
    fireEvent.change(search, { target: { value: 'health' } });
    fireEvent.click(await screen.findByRole('option', { name: /Health/ }));
    await waitFor(() => expect(window.location.hash).toBe('#/docs/health/0'));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Health' })
    ).toBeInTheDocument();
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
    expect(labels()).toEqual([
      'Composition',
      'Gallery',
      'Callout',
      'Divider',
      'Health',
      'Stat group',
    ]);
    expect(
      within(nav).getByRole('button', { current: 'page' })
    ).toHaveTextContent('Callout');

    fireEvent.change(
      within(nav).getByRole('searchbox', { name: 'Filter primitives' }),
      { target: { value: 'statGroup' } }
    );
    expect(headings()).toEqual(['Data display']);
    expect(labels()).toEqual(['Composition', 'Gallery', 'Stat group']);
  });

  it('shows a schema-derived prop table below the source editor without first-node editing controls', async () => {
    await renderStudio();
    expect(screen.queryByRole('button', { name: '+ Prop' })).toBeNull();
    const toggle = screen.getByRole('button', { name: 'Props' });
    const sourcePanel = screen.getByRole('region', { name: 'Source editor' });
    expect(sourcePanel).toContainElement(
      screen.getByRole('button', { name: 'Copy JSON' })
    );
    expect(sourcePanel).not.toContainElement(toggle);
    const workbenchPanel = screen.getByRole('region', {
      name: 'Composition workbench',
    });
    expect(workbenchPanel).toContainElement(
      screen.getByRole('region', { name: 'Outputs' })
    );
    expect(workbenchPanel).toContainElement(toggle);
    expect(
      toggle.compareDocumentPosition(screen.getByText('Valid')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      screen.queryByRole('region', { name: 'Primitive prop reference' })
    ).toBeNull();
    fireEvent.click(toggle);

    const reference = screen.getByRole('region', {
      name: 'Primitive prop reference',
    });
    expect(workbenchPanel).toContainElement(reference);
    expect(within(reference).queryByRole('heading')).not.toBeInTheDocument();
    const propDetails = Array.from(reference.querySelectorAll('tr')).map(
      (detail) => detail.textContent ?? ''
    );
    expect(
      within(reference).getByText('body', { selector: 'code' })
    ).toBeInTheDocument();
    expect(propDetails.some((detail) => detail.includes('required'))).toBe(
      true
    );
    expect(
      within(reference).getByText('tone', { selector: 'code' })
    ).toBeInTheDocument();
    expect(reference.querySelectorAll('table')).toHaveLength(1);
    expect(
      screen
        .getByRole('textbox', { name: 'Callout source' })
        .compareDocumentPosition(reference) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    fireEvent.click(toggle);
    expect(
      screen.queryByRole('region', { name: 'Primitive prop reference' })
    ).toBeNull();
  });

  it('shows child-component prop tables using their JSX member names', async () => {
    window.location.hash = '#/dev/statGroup/0';
    render(<IsomerStudio {...{ runtime }} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Props' }));
    const reference = await screen.findByRole('region', {
      name: 'Primitive prop reference',
    });
    expect(
      within(reference).getByRole('tab', {
        name: 'StatGroup',
      })
    ).toBeInTheDocument();
    fireEvent.click(
      within(reference).getByRole('tab', { name: 'StatGroup.Stat' })
    );
    const child = within(reference).getByRole('tabpanel', {
      name: 'StatGroup.Stat',
    });
    expect(within(child).getByRole('table')).toBeInTheDocument();
    expect(
      within(child).getByText('label', { selector: 'code' })
    ).toBeInTheDocument();
    expect(
      [...child.querySelectorAll('tbody tr td:first-child code')].map(
        (element) => element.textContent
      )
    ).toEqual(expect.arrayContaining(['label', 'value']));
  });

  it('starts with collapsed navigation on narrow screens and lets readers expand it', async () => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => ({
      ...matchMedia(query),
      matches: query.includes('max-width'),
    });
    try {
      window.location.hash = '#/docs/callout/0';
      render(<IsomerStudio {...{ runtime }} />);
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Callout' })
      ).toBeInTheDocument();

      const expand = screen.getByRole('button', {
        name: 'Expand primitive navigation',
      });
      expect(expand).toHaveAttribute('aria-expanded', 'false');
      fireEvent.click(expand);
      expect(
        screen.getByRole('button', { name: 'Collapse primitive navigation' })
      ).toHaveAttribute('aria-expanded', 'true');
    } finally {
      window.matchMedia = matchMedia;
    }
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

    expect(screen.queryByText(purpose)).not.toBeInTheDocument();
    fireEvent.mouseEnter(divider);
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

  it('switches between Workbench and Reference without changing routes', async () => {
    expect(await renderStudio()).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reference' }));
    expect(
      screen.getByRole('heading', { level: 1, name: 'Callout' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Guidance' })
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('#/docs/callout/0');

    fireEvent.click(screen.getByRole('button', { name: 'Workbench' }));
    expect(await findEditor()).toBeInTheDocument();
    expect(window.location.hash).toBe('#/dev/callout/0');
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

  it('references every primitive in the draft and keeps the reference when a draft does not parse', async () => {
    const editor = await renderStudio();
    fireEvent.click(screen.getByRole('button', { name: 'Props' }));
    const nodes = [{ type: 'callout', body: 'Drafted.' }, { type: 'divider' }];
    fireEvent.change(editor, {
      target: { value: JSON.stringify(nodes) },
    });
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Text preview' })
      ).toHaveTextContent('Drafted.')
    );
    const reference = screen.getByRole('region', {
      name: 'Primitive prop reference',
    });
    expect(
      within(reference).getByRole('tab', { name: 'Callout' })
    ).toBeInTheDocument();
    expect(
      within(reference).getByRole('tab', { name: 'Divider' })
    ).toBeInTheDocument();

    const draft = '{ "type": "callout",';
    fireEvent.change(editor, { target: { value: draft } });
    expect(await screen.findByText('JSON error')).toBeInTheDocument();
    expect(
      within(reference).getByRole('tab', { name: 'Divider' })
    ).toBeInTheDocument();
    expect(editor).toHaveValue(draft);
  });

  it('reports a source edit the host composer rejects', async () => {
    const compose: StudioCompose = (nodes, options) => {
      if (nodes.some((node) => 'tone' in node && node.tone === 'danger')) {
        throw new Error('The composer refused this tone.');
      }
      return defaultCompose(nodes, options);
    };
    render(<IsomerStudio {...{ runtime, compose }} />);
    const editor = await findEditor();
    const draft = JSON.stringify({
      type: 'callout',
      body: 'Draft.',
      tone: 'danger',
    });
    fireEvent.change(editor, { target: { value: draft } });

    expect(
      await screen.findByText(/The composer refused this tone\./)
    ).toBeInTheDocument();
    expect(await findEditor()).toHaveValue(draft);
  });

  it('keeps the Workbench draft while Reference is open', async () => {
    const editor = await renderStudio();
    const draft = JSON.stringify({ type: 'callout', body: 'Kept.' });
    fireEvent.change(editor, { target: { value: draft } });

    fireEvent.click(screen.getByRole('button', { name: 'Reference' }));
    const nav = screen.getByRole('navigation', { name: 'Primitives' });
    fireEvent.click(within(nav).getByRole('button', { name: 'Divider' }));
    fireEvent.click(within(nav).getByRole('button', { name: 'Callout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Workbench' }));

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

  it('opens a primitive whose type JSX cannot name as JSON', async () => {
    const schema = z.object({
      type: z.literal('metric-card'),
      label: z.string(),
    });
    const example = { type: 'metric-card' as const, label: 'Hosts' };
    const metricCard = definePrimitive<
      z.infer<typeof schema>,
      DefaultPackTypes
    >({
      type: 'metric-card',
      catalog: {
        type: 'metric-card',
        purpose: 'A metric.',
        useWhen: [],
        avoidWhen: [],
        example,
      },
      examples: [example],
      schema,
      renderers: {
        react: () => null,
        text: () => '',
        markdown: () => [],
      },
    });
    const hyphenated = createIsomerRuntime<unknown, StyledRenderContext>({
      packs: [definePrimitivePack({ id: 'metrics', primitives: [metricCard] })],
    });
    window.location.hash = '#/dev/metric-card/0';
    render(<IsomerStudio runtime={hyphenated} {...{ transformJsx }} />);

    const editor = await screen.findByRole<HTMLTextAreaElement>('textbox', {
      name: 'Metric card source',
    });
    expect(JSON.parse(editor.value)).toEqual(example);
  });

  it('disables the handoff when the composed payload is too large for a link', async () => {
    const compose: StudioCompose = (nodes, options) => ({
      ...defaultCompose(nodes, options),
      title: 'x'.repeat(1_000_001),
    });
    render(<IsomerStudio {...{ runtime, compose }} />);
    await findEditor();
    expect(
      screen.getByRole('button', { name: 'Open in the composition editor' })
    ).toBeDisabled();
  });

  describe('composition editor', () => {
    const findComposer = () =>
      screen.findByRole<HTMLTextAreaElement>('textbox', {
        name: 'Composition source',
      });
    const textPreview = () =>
      screen.getByRole('region', { name: 'Text preview' });
    const workbench = () =>
      within(screen.getByRole('region', { name: 'Composition workbench' }));
    const openLink = async (source: string, lang: 'jsx' | 'json') => {
      window.location.hash = `#/compose?code=${await encodeSource(source)}&lang=${lang}`;
    };

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
