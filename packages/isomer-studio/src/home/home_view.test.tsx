/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { createIsomerRuntime, defineView } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { render, screen, within } from '@testing-library/react';
import { z } from 'zod';

import type { StudioApp } from '../config';
import { FEATURED_COUNT } from '../config';
import { componentsPack } from '../fixtures/components_pack';
import { createShim } from '../model/compile_jsx';
import { defaultCompose } from '../model/compose_example';
import { describeRuntime } from '../model/describe_runtime';
import type { StudioContextValue } from '../studio_context';
import { StudioContextProvider } from '../studio_context';

import { HomeView } from './home_view';
import { APPS_DOCS_URL, VIEWS_DOCS_URL } from './links';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const withView = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
  views: [
    defineView({
      id: 'ops.health',
      title: 'Service health',
      description: 'Every service and how it is doing.',
      answers: ['Are my services healthy?'],
      input: z.object({}),
      build: () => ({ type: 'view', body: [] }),
    }),
  ],
});

const decks: StudioApp = {
  id: 'decks',
  title: 'Decks',
  description: 'Whole presentations, one slide at a time.',
  load: () => Promise.reject(new Error('never loaded')),
};

const renderHome = ({
  apps = [],
  featured,
  current = runtime,
}: {
  apps?: readonly StudioApp[];
  featured?: readonly string[];
  current?: typeof runtime;
} = {}) => {
  const value: StudioContextValue = {
    runtime: current,
    apps,
    featured,
    docs: describeRuntime(current),
    shim: createShim(current.primitives),
    schemaFor: () => undefined,
    theme: 'light',
    compose: (nodes) => defaultCompose(nodes, { theme: 'light' }),
  };
  const navigate = vi.fn();
  render(
    <EuiProvider colorMode="dark">
      <StudioContextProvider {...{ value }}>
        <HomeView
          title="Isomer Studio"
          router={{
            route: { mode: 'docs', page: 'callout', example: 0 },
            navigate,
          }}
          {...{ featured }}
        />
      </StudioContextProvider>
    </EuiProvider>
  );
  return { navigate };
};

const featuredTiles = () =>
  within(screen.getByRole('region', { name: 'Featured primitives' }))
    .getAllByTestId('featured-primitive')
    .map((tile) => tile.querySelector('a')?.getAttribute('href'));

describe('HomeView', () => {
  it('features the configured primitives in order, with Docs and Dev links', () => {
    renderHome({ featured: ['statGroup', 'callout'] });
    expect(featuredTiles()).toEqual(['#/docs/statGroup/0', '#/docs/callout/0']);
    const first = within(
      screen.getByRole('region', { name: 'Featured primitives' })
    ).getAllByTestId('featured-primitive')[0]!;
    expect(within(first).getByRole('link', { name: 'Dev →' })).toHaveAttribute(
      'href',
      '#/dev/statGroup/0'
    );
    expect(
      screen.getByRole('link', { name: /4 primitives in this Studio/ })
    ).toHaveAttribute('href', '#/docs/gallery');
  });

  it('draws distinct primitives at random without a configured list', () => {
    renderHome();
    const tiles = featuredTiles();
    expect(tiles).toHaveLength(Math.min(FEATURED_COUNT, 4));
    expect(new Set(tiles).size).toBe(tiles.length);
  });

  it('links each category to its group in the gallery', () => {
    renderHome();
    const categories = screen.getByRole('navigation', {
      name: 'Primitive categories',
    });
    expect(
      within(categories)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')])
    ).toEqual([
      ['Narrative and content2', '#/docs/gallery/Narrative%20and%20content'],
      ['Data display2', '#/docs/gallery/Data%20display'],
    ]);
  });

  it('shows how to add apps and views when the runtime has none', () => {
    renderHome();
    const applications = screen.getByRole('region', { name: 'Applications' });
    expect(within(applications).queryAllByTestId('home-app')).toEqual([]);
    const add = within(applications).getByTestId('home-add-app');
    expect(add).toHaveTextContent('No applications yet');
    expect(add).toHaveAttribute('href', APPS_DOCS_URL);

    const apps = screen.getByRole('region', { name: 'Apps' });
    expect(apps).toHaveTextContent('None configured.');
    expect(
      within(apps).getByRole('link', { name: /Read about apps/ })
    ).toHaveAttribute('href', APPS_DOCS_URL);

    const views = screen.getByRole('region', { name: 'Views' });
    expect(views).toHaveTextContent('None registered.');
    expect(
      within(views).getByRole('link', { name: /Read about views/ })
    ).toHaveAttribute('href', VIEWS_DOCS_URL);
  });

  it('lists the apps and views the runtime has', () => {
    renderHome({ apps: [decks], current: withView });
    const applications = screen.getByRole('region', { name: 'Applications' });
    const tile = within(applications).getByTestId('home-app');
    expect(tile).toHaveAttribute('href', '#/app/decks/');
    expect(tile).toHaveTextContent('Whole presentations, one slide at a time.');
    expect(within(applications).getByTestId('home-add-app')).toHaveTextContent(
      'How do I add an application?'
    );

    const apps = screen.getByRole('region', { name: 'Apps' });
    expect(apps).toHaveTextContent('Decks');
    expect(apps).not.toHaveTextContent('None configured.');

    const views = screen.getByRole('region', { name: 'Views' });
    expect(views).toHaveTextContent('ops.health');
    expect(views).toHaveTextContent('Every service and how it is doing.');
  });

  it('lists the packs and surfaces the runtime loaded', () => {
    renderHome();
    const packs = screen.getByRole('region', { name: 'Primitive packs' });
    expect(packs).toHaveTextContent('components');
    expect(packs).toHaveTextContent('4 primitives · 2 groups');
    const surfaces = screen.getByRole('region', { name: 'Surfaces' });
    expect(surfaces).toHaveTextContent('react');
    expect(surfaces).toHaveTextContent('text');
    expect(surfaces).not.toHaveTextContent('snapshot');
  });
});
