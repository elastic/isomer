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

import { APPS_DOCS_URL, DOCS_URL, VIEWS_DOCS_URL } from '../chrome/links';
import type { StudioApp } from '../config';
import { FEATURED_COUNT } from '../config';
import { componentsPack } from '../fixtures/components_pack';
import { createShim } from '../model/compile_jsx';
import { defaultCompose } from '../model/compose_example';
import { describeRuntime } from '../model/describe_runtime';
import type { StudioContextValue } from '../studio_context';
import { StudioContextProvider } from '../studio_context';

import { HomeView } from './home_view';

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
  render(
    <EuiProvider colorMode="light">
      <StudioContextProvider {...{ value }}>
        <HomeView title="Isomer Studio" />
      </StudioContextProvider>
    </EuiProvider>
  );
};

const region = (name: RegExp | string) => screen.getByRole('region', { name });

const featuredCards = () =>
  within(region('Featured primitives')).getAllByTestId('featured-primitive');

describe('HomeView', () => {
  it('leads with the title and links to the gallery, the Workbench, the composer and the docs', () => {
    renderHome();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Isomer Studio' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Learn each primitive of components/)
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Browse primitives' })
    ).toHaveAttribute('href', '#/docs/gallery');
    expect(
      screen.getByRole('link', { name: 'Open the Workbench' })
    ).toHaveAttribute('href', '#/dev/callout/0');
    expect(screen.getByRole('link', { name: 'Compose' })).toHaveAttribute(
      'href',
      '#/compose'
    );
    expect(screen.getByRole('link', { name: /Isomer docs/ })).toHaveAttribute(
      'href',
      DOCS_URL
    );
  });

  it('features the configured primitives in order, each with a preview and Reference and Workbench links', () => {
    renderHome({ featured: ['statGroup', 'callout'] });
    const cards = featuredCards();
    expect(
      cards.map((card) => within(card).getByRole('heading').textContent)
    ).toEqual(['Stat group', 'Callout']);
    const [first] = cards;
    expect(
      within(first!).getByRole('link', { name: 'Reference' })
    ).toHaveAttribute('href', '#/docs/statGroup/0');
    expect(
      within(first!).getByRole('link', { name: 'Workbench' })
    ).toHaveAttribute('href', '#/dev/statGroup/0');
    expect(first!.querySelector('[inert]')).not.toBeNull();
    expect(
      within(region('Featured primitives')).getByRole('link', {
        name: 'All 4 primitives',
      })
    ).toHaveAttribute('href', '#/docs/gallery');
  });

  it('draws distinct primitives at random without a configured list', () => {
    renderHome();
    const titles = featuredCards().map(
      (card) => within(card).getByRole('heading').textContent
    );
    expect(titles).toHaveLength(Math.min(FEATURED_COUNT, 4));
    expect(new Set(titles).size).toBe(titles.length);
  });

  it('shows how to add apps and views when the runtime has none', () => {
    renderHome();
    const apps = region('Apps');
    expect(apps).toHaveTextContent('No apps configured');
    expect(
      within(apps).getByRole('link', { name: /Read about apps/ })
    ).toHaveAttribute('href', APPS_DOCS_URL);

    const views = region('Views');
    expect(views).toHaveTextContent('No views registered');
    expect(
      within(views).getByRole('link', { name: /Read about views/ })
    ).toHaveAttribute('href', VIEWS_DOCS_URL);
  });

  it('lists the apps and views the runtime has', () => {
    renderHome({ apps: [decks], current: withView });
    const apps = region('Apps');
    expect(within(apps).getByTestId('home-app')).toHaveAttribute(
      'href',
      '#/app/decks/'
    );
    expect(apps).toHaveTextContent('Whole presentations, one slide at a time.');
    expect(apps).not.toHaveTextContent('No apps configured');

    const views = region('Views');
    expect(views).toHaveTextContent('ops.health');
    expect(views).toHaveTextContent('Every service and how it is doing.');
  });

  it('lists the packs and surfaces the runtime loaded', () => {
    renderHome();
    const packs = region('Primitive packs');
    expect(packs).toHaveTextContent('components');
    expect(packs).toHaveTextContent('4 primitives · 2 groups');
    const surfaces = region('Surfaces');
    expect(surfaces).toHaveTextContent('React');
    expect(surfaces).toHaveTextContent('Plain text with no markup.');
    expect(surfaces).not.toHaveTextContent('Snapshot');
  });
});
