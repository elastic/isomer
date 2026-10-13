/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, StyledRenderContext } from '@elastic/isomer-sdk';

import type { StudioCompose } from '../config';
import type { CalloutNode } from '../fixtures/components_pack';
import { componentsPack } from '../fixtures/components_pack';

import { composeExample } from './compose_example';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const callout: CalloutNode = {
  type: 'callout',
  tone: 'warning',
  body: 'Disk full.',
};

describe('composeExample', () => {
  it('wraps nodes in a view by default', () => {
    expect(composeExample(undefined, [callout], 'dark')).toEqual({
      type: 'view',
      body: [callout],
      theme: 'dark',
    });
  });

  it('renders the default envelope as a hand-written view composition', () => {
    const composed = composeExample(undefined, [callout], 'light');
    const handWritten: Composition = {
      type: 'view',
      body: [callout],
      theme: 'light',
    };

    expect(runtime.surfaces.html.render(composed).html).toBe(
      runtime.surfaces.html.render(handWritten).html
    );
  });

  it('hands the nodes and theme to the config’s compose', () => {
    const compose = vi.fn<StudioCompose>((nodes, { theme }) => ({
      type: 'view',
      title: 'Composed',
      body: [...nodes],
      theme,
    }));

    expect(composeExample(compose, [callout], 'dark')).toMatchObject({
      title: 'Composed',
    });
    expect(compose).toHaveBeenCalledWith([callout], { theme: 'dark' });
  });
});
