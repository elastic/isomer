/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { act, render, screen } from '@testing-library/react';

import { componentsPack } from '../fixtures/components_pack';
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
    expect(MockObserver.observers).toHaveLength(exampleCount - GALLERY_COLUMNS);

    act(() => {
      MockObserver.observers.forEach((observer) => observer.intersect());
    });

    expect(previews()).toHaveLength(exampleCount);
    for (const observer of MockObserver.observers) {
      expect(observer.disconnect).toHaveBeenCalled();
    }
  });
});
