/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type {
  DefaultPackTypes,
  StyledRenderContext,
} from '@elastic/isomer-sdk';
import { definePrimitive, definePrimitivePack } from '@elastic/isomer-sdk';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { z } from 'zod';

import type { StudioCompose } from './config';
import {
  findEditor,
  renderStudio,
  runtime,
  transformJsx,
} from './fixtures/studio_harness';
import { defaultCompose } from './model/compose_example';
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
});
