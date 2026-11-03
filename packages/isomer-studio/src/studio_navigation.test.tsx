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

import { componentsPrimitives } from './fixtures/components_pack';
import { findEditor, renderStudio, runtime } from './fixtures/studio_harness';
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
});
