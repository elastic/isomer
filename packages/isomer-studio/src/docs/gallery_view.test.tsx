/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { act, render, screen, within } from '@testing-library/react';

import { componentsPack } from '../fixtures/components_pack';
import { describeRuntime } from '../model/describe_runtime';
import { readExamples } from '../model/read_examples';
import { IsomerStudio } from '../studio';

import { GALLERY_COLUMNS } from './gallery_view';

const runtime = createIsomerRuntime<unknown, StyledRenderContext>({
  packs: [componentsPack],
});

const exampleCount = runtime.primitives.reduce(
  (count, definition) => count + readExamples(definition).length,
  0
);

class MockObserver {
  static readonly observers: MockObserver[] = [];

  readonly observe = vi.fn();

  readonly disconnect = vi.fn();

  readonly unobserve = vi.fn();

  readonly root = null;

  readonly rootMargin = '';

  readonly thresholds = [0];

  constructor(
    private readonly callback: (
      entries: IntersectionObserverEntry[],
      observer: MockObserver
    ) => void
  ) {
    MockObserver.observers.push(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  intersect() {
    this.callback(
      [{ isIntersecting: true } as IntersectionObserverEntry],
      this
    );
  }
}

const previewObservers = () =>
  MockObserver.observers.filter(
    ({ observe }) => !observe.mock.calls.some(([{ id }]) => id)
  );

const previews = () => screen.queryAllByTitle('React preview');

describe('GalleryView', () => {
  beforeEach(() => {
    MockObserver.observers.length = 0;
    window.location.hash = '#/docs/gallery';
    vi.stubGlobal('IntersectionObserver', MockObserver);
  });

  afterEach(() => {
    window.location.hash = '';
    vi.unstubAllGlobals();
  });

  it('mounts the first row immediately and the rest as they near the viewport', () => {
    render(<IsomerStudio {...{ runtime }} />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Gallery' })
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('link', { name: /Open .+ in Dev/ })
    ).toHaveLength(exampleCount);
    expect(previews()).toHaveLength(GALLERY_COLUMNS);
    expect(previewObservers()).toHaveLength(exampleCount - GALLERY_COLUMNS);

    act(() => {
      previewObservers().forEach((observer) => observer.intersect());
    });

    expect(previews()).toHaveLength(exampleCount);
    for (const observer of previewObservers()) {
      expect(observer.disconnect).toHaveBeenCalled();
    }
  });

  it('lists each group in an "On this page" gutter', () => {
    render(<IsomerStudio {...{ runtime }} />);

    const toc = screen.getByRole('navigation', { name: 'On this page' });
    const titles = describeRuntime(runtime).groups.map(({ title }) => title);
    expect(
      within(toc)
        .getAllByRole('button')
        .map(({ textContent }) => textContent)
    ).toEqual(titles);
    expect(within(toc).getAllByRole('button')[0]).toHaveAttribute(
      'aria-current',
      'location'
    );
  });
});
