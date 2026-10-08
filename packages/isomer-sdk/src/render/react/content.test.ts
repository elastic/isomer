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
  renderCompositionContent,
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

  it('sets data-theme and color-scheme for an explicit theme', () => {
    expect(render(composition, { theme: 'dark' })).toContain(
      'data-theme="dark" style="color-scheme:dark"'
    );
    const auto = render(composition, { theme: 'auto' });
    expect(auto).not.toContain('data-theme');
    expect(auto).not.toContain('color-scheme');
  });

  it("defaults to the composition's theme, as the html surface does", () => {
    const dark: Composition = { ...composition, theme: 'dark' };
    expect(render(dark)).toContain('data-theme="dark"');
    expect(render(dark, { theme: 'light' })).toContain('data-theme="light"');
    expect(render(dark, { theme: 'auto' })).not.toContain('data-theme');
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
describe('renderCompositionContent', () => {
  const dispatcher = {
    renderReact: (node: { type: string }) =>
      createElement('p', null, node.type),
  };
  const content = (heading?: boolean) =>
    renderToStaticMarkup(
      createElement(() =>
        renderCompositionContent(
          { ...composition, subtitle: 'Today' },
          dispatcher,
          {},
          heading === undefined ? {} : { heading }
        )
      )
    );

  it('renders the heading, then each body node through the dispatcher', () => {
    expect(content()).toBe(
      '<h2>Checkout</h2><p class="sub">Today</p><p>note</p>'
    );
  });

  it('leaves out the heading when asked', () => {
    expect(content(false)).toBe('<p>note</p>');
  });
});
