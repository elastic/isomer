/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { act, createElement, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ancestors, useScheme } from './scheme';

const shadowTree = () => {
  const host = document.createElement('div');
  document.body.append(host);
  const root = host.attachShadow({ mode: 'open' });
  const section = document.createElement('section');
  root.append(section);
  return { host, section };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('ancestors', () => {
  it('continues through shadow hosts to the document element', () => {
    const { host, section } = shadowTree();
    const chart = document.createElement('div');
    section.append(chart);

    expect(ancestors(chart)).toEqual([
      chart,
      section,
      host,
      document.body,
      document.documentElement,
    ]);
  });
});

describe('useScheme', () => {
  it('repaints when the shadow host outside its shadow root changes scheme', async () => {
    (
      globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    vi.stubGlobal('matchMedia', () => ({
      matches: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { host, section } = shadowTree();
    // jsdom does not cascade `color-scheme`, so the host's attribute stands in for it.
    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      () =>
        ({
          colorScheme: host.getAttribute('data-scheme') ?? 'normal',
        }) as CSSStyleDeclaration
    );
    const seen: (string | undefined)[] = [];
    const Probe = () => {
      const ref = useRef<HTMLDivElement>(null);
      seen.push(useScheme(ref));
      return createElement('div', { ref });
    };

    const root = createRoot(section);
    act(() => root.render(createElement(Probe)));
    expect(seen.at(-1)).toBe('light');

    // The observer reports on a microtask, which `act` flushes once awaited.
    await act(async () => {
      host.setAttribute('data-scheme', 'dark');
      await Promise.resolve();
    });
    expect(seen.at(-1)).toBe('dark');

    act(() => root.unmount());
  });
});
