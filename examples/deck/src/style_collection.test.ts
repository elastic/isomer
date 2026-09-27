/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SLIDE_BUILDS } from '@elastic/isomer-primitives-slides';
import { describe, expect, it } from 'vitest';

import { deck } from './deck';
import { runtime } from './runtime';

describe('html.createStyleCollection', () => {
  it.each(deck.map(({ slug, composition }) => [slug, composition] as const))(
    '%s: one React render collects the html surface’s CSS',
    (_slug, composition) => {
      const styles = runtime.surfaces.html.createStyleCollection(composition, {
        heading: false,
      });
      const node = runtime.surfaces.react.render(composition, {
        context: styles.context,
        heading: false,
        wrapper: styles.wrapper,
      });
      renderToStaticMarkup(createElement(() => node));
      expect(styles.css()).toBe(
        runtime.surfaces.html.render(composition, {
          css: 'separate',
          heading: false,
        }).css
      );
    }
  );

  it.each(deck.map(({ slug, composition }) => [slug, composition] as const))(
    '%s: the same holds with builds requested',
    (_slug, composition) => {
      const options = { heading: false, enhancements: [SLIDE_BUILDS] };
      const styles = runtime.surfaces.html.createStyleCollection(
        composition,
        options
      );
      const node = runtime.surfaces.react.render(composition, {
        context: styles.context,
        heading: false,
        wrapper: styles.wrapper,
      });
      renderToStaticMarkup(createElement(() => node));
      expect(styles.css()).toBe(
        runtime.surfaces.html.render(composition, {
          ...options,
          css: 'separate',
        }).css
      );
    }
  );

  it('collects nothing before the tree renders', () => {
    const styles = runtime.surfaces.html.createStyleCollection(
      deck[0]!.composition
    );
    expect(styles.css()).toBe('');
  });
});
