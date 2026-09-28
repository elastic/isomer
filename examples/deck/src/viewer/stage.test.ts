/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { commandsSlide } from '../slides/33_commands';

import { Stage } from './stage';
import type { SurfaceId } from './surfaces';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const slide = { slug: 'commands', composition: commandsSlide, sources: [] };

let root: Root;
let container: HTMLElement;
let writeText: ReturnType<typeof vi.fn>;

beforeEach(() => {
  writeText = vi.fn(() => Promise.resolve());
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

const render = (surface: SurfaceId, theme: 'light' | 'dark' = 'light') => {
  act(() =>
    root.render(
      createElement(Stage, {
        fullscreen: false,
        pngUrl: () => '',
        slide,
        surface,
        theme,
      })
    )
  );
  const shadow = [...container.querySelectorAll('div')].find(
    ({ shadowRoot }) => shadowRoot
  )?.shadowRoot;
  expect(shadow).toBeDefined();
  return shadow!;
};

describe('Stage', () => {
  it.each<SurfaceId>(['html', 'slide'])(
    'adds a working Copy button to each command on the %s surface',
    (surface) => {
      const shadow = render(surface);
      const buttons =
        shadow.querySelectorAll<HTMLButtonElement>('[data-slide-copy]');
      expect(buttons).toHaveLength(3);
      act(() => buttons[1]!.click());
      expect(writeText).toHaveBeenCalledWith('pnpm install');
    }
  );

  it('adds each Copy button once across a theme change', () => {
    render('slide');
    const shadow = render('slide', 'dark');
    expect(shadow.querySelectorAll('[data-slide-copy]')).toHaveLength(3);
  });
});
