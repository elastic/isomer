/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { act, screen } from '@testing-library/react';

import type { StudioApp, StudioConfig } from '../config';
import { componentsPack } from '../fixtures/components_pack';

import { mountStudio } from './mount';

vi.mock('../dev/monaco_editor', async () => {
  const { createElement } =
    await vi.importActual<typeof import('react')>('react');
  return { MonacoEditor: () => createElement('textarea') };
});

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const app = (id: string): StudioApp => ({
  id,
  title: `App ${id}`,
  load: () => Promise.resolve({ default: () => <p>{id}</p> }),
});

describe('mountStudio', () => {
  beforeEach(() => {
    window.location.hash = '#/dev';
    document.body.innerHTML = '<div id="root"></div>';
  });

  it('keeps the last valid apps when an update brings invalid ones', async () => {
    const config: StudioConfig = { runtime, apps: [app('first')] };
    let studio: ReturnType<typeof mountStudio> | undefined;
    act(() => {
      studio = mountStudio(config, {});
    });
    expect(
      await screen.findByRole('button', { name: 'App first' })
    ).toBeInTheDocument();

    const invalid = [{ ...app('second'), load: 'app.tsx' }];
    act(() =>
      studio?.update({ runtime, apps: invalid as unknown as StudioApp[] }, {})
    );

    expect(
      await screen.findByText('apps[0] ("second"): load must be a function.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'App first' })
    ).toBeInTheDocument();

    act(() => studio?.update({ runtime, apps: [app('third')] }, {}));
    expect(
      await screen.findByRole('button', { name: 'App third' })
    ).toBeInTheDocument();
    expect(
      screen.queryByText('apps[0] ("second"): load must be a function.')
    ).toBeNull();
  });
});
