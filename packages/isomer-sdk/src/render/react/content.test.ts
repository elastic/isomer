/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Composition } from '../../composition/composition';

import {
  type CompositionWrapperOptions,
  wrapCompositionContent,
} from './content';

const composition: Composition = {
  type: 'view',
  title: 'Checkout',
  body: [{ type: 'note' }],
};

const render = (
  target: Composition = composition,
  options: CompositionWrapperOptions = {}
): string =>
  renderToStaticMarkup(
    createElement(() =>
      wrapCompositionContent(createElement('p', null, 'body'), target, options)
    )
  );

describe('wrapCompositionContent', () => {
  it('emits the framed section with the title as its label and no data-theme for auto', () => {
    expect(render()).toBe(
      '<section class="isomer framed" role="group" aria-label="Checkout"><p>body</p></section>'
    );
  });

  it('sets data-theme for an explicit theme', () => {
    expect(render(composition, { theme: 'dark' })).toContain(
      'data-theme="dark"'
    );
    expect(render(composition, { theme: 'auto' })).not.toContain('data-theme');
  });

  it('prefers meta.ariaLabel, then the title, then the default label', () => {
    expect(
      render({ ...composition, meta: { ariaLabel: 'Cart health' } })
    ).toContain('aria-label="Cart health"');
    expect(render({ type: 'view', body: [] })).toContain('aria-label="View"');
    expect(
      render({ type: 'view', body: [] }, { defaultAriaLabel: 'Panel' })
    ).toContain('aria-label="Panel"');
  });

  it('toggles the framed and fluid classes', () => {
    expect(render(composition, { framed: false })).toContain('class="isomer"');
    expect(render(composition, { fluid: true })).toContain(
      'class="isomer framed fluid"'
    );
    expect(render(composition, { framed: false, fluid: true })).toContain(
      'class="isomer fluid"'
    );
  });
});
