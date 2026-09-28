/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { SlideFrameNode } from '@elastic/isomer-primitives-slides';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Viewer } from './app';
import type { DeckSlide } from './types';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const slideOf = (slug: string, ...body: SlideFrameNode['body']): DeckSlide => {
  const frame: SlideFrameNode = { type: 'slideFrame', logo: false, body };
  return {
    slug,
    composition: { type: 'view', title: slug, body: [frame] },
    sources: [{ id: 'jsx', label: 'JSX', text: `<Slide title="${slug}" />` }],
  };
};

const heading = (title: string) => ({ type: 'slideHeading' as const, title });

const intro = slideOf('intro', {
  type: 'slideSection',
  number: '01',
  title: 'Intro',
  contents: ['End'],
  hrefs: ['?slide=end'],
});
const list = slideOf('list', heading('List'), {
  type: 'slideBulletList',
  items: ['One', 'Two', 'Three'],
});
const end = slideOf('end', heading('End'));

let root: Root;
let container: HTMLElement;
let overflowChecks: ReturnType<typeof vi.fn>;

const show = (slides: readonly DeckSlide[]) =>
  act(() =>
    root.render(
      createElement(Viewer, {
        slides,
        pngUrl: () => '',
        logoSrc: '',
        homeHref: '/',
      })
    )
  );

const open = (search: string, slides: readonly DeckSlide[]) => {
  window.history.replaceState(null, '', `/${search}`);
  show(slides);
};

const pager = () =>
  container.querySelector('.pager [aria-live]')?.textContent ?? '';

const button = (label: string) =>
  container.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;

const press = (key: string, target: EventTarget = window) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

const stageRoot = () =>
  [...container.querySelectorAll('.stage div')].find(
    ({ shadowRoot }) => shadowRoot
  )!.shadowRoot!;

beforeEach(() => {
  overflowChecks = vi.fn();
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: { then: overflowChecks } },
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Viewer', () => {
  it('follows a section link inside the slide without leaving the page', () => {
    open('?slide=intro', [intro, list, end]);
    const link = stageRoot().querySelector('a[href="?slide=end"]')!;
    const click = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      composed: true,
      button: 0,
    });
    act(() => {
      link.dispatchEvent(click);
    });
    expect(click.defaultPrevented).toBe(true);
    expect(pager()).toBe('02 / 02');
    expect(new URLSearchParams(window.location.search).get('slide')).toBe(
      'end'
    );
  });

  it('leaves a query link that names no slide to the browser', () => {
    const themed = slideOf('themed', {
      type: 'slideSection',
      number: '01',
      title: 'Themed',
      contents: ['Dark'],
      hrefs: ['?theme=dark'],
    });
    open('?slide=themed', [end, themed]);
    const link = stageRoot().querySelector('a[href="?theme=dark"]')!;
    let intercepted: boolean | undefined;
    // Runs after the viewer's own listener, and keeps happy-dom from navigating.
    const record = (event: Event) => {
      intercepted = event.defaultPrevented;
      event.preventDefault();
    };
    window.addEventListener('click', record);
    act(() => {
      link.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          composed: true,
          button: 0,
        })
      );
    });
    window.removeEventListener('click', record);
    expect(intercepted).toBe(false);
    expect(pager()).toBe('01 / 01');
  });

  it('reveals a slide’s parts from the pager before moving on', () => {
    open('?slide=list&build=0', [intro, list, end]);
    expect(pager()).toBe('01 / 02 · 0/3');
    act(() => button('Next slide').click());
    expect(pager()).toBe('01 / 02 · 1/3');
    act(() => button('Previous slide').click());
    expect(pager()).toBe('01 / 02 · 0/3');
    act(() => button('Previous slide').click());
    expect(pager()).toBe('00 / 02');
    expect(button('Previous slide').disabled).toBe(true);
  });

  it('keeps Next enabled on the last slide while it has parts to reveal', () => {
    open('?slide=list&build=1', [intro, list]);
    expect(button('Next slide').disabled).toBe(false);
    act(() => button('Next slide').click());
    act(() => button('Next slide').click());
    expect(pager()).toBe('01 / 01');
    expect(button('Next slide').disabled).toBe(true);
  });

  it('steps back from the last slide after the deck shrinks under it', () => {
    open('?slide=end', [intro, list, end]);
    show([intro, end]);
    expect(pager()).toBe('01 / 01');
    act(() => button('Previous slide').click());
    expect(pager()).toBe('00 / 01');
  });

  it.each([
    ['a toolbar button', () => button('Next slide'), [' ']],
    [
      'a surface tab',
      () => container.querySelector('[role="tab"]')!,
      [' ', 'ArrowRight', 'ArrowLeft'],
    ],
    [
      'the source panel',
      () => {
        press('s');
        return container.querySelector('.source-panel pre')!;
      },
      [' ', 'ArrowDown', 'ArrowRight', 'PageDown', 'End'],
    ],
  ])('leaves %s its own keys', (_label, target, keys) => {
    open('?slide=intro', [intro, list, end]);
    const element = target();
    for (const key of keys) {
      expect(press(key, element).defaultPrevented).toBe(false);
    }
    expect(pager()).toBe('00 / 02');
  });

  it('still steps with the arrow keys from a focused toolbar button', () => {
    open('?slide=intro', [intro, list, end]);
    expect(press('ArrowRight', button('Next slide')).defaultPrevented).toBe(
      true
    );
    expect(pager()).toBe('01 / 02 · 0/3');
  });

  it.each(['slide', 'html'])(
    'checks overflow on the %s stage again when a part is revealed, not when the viewer re-renders',
    (surface) => {
      open(`?slide=list&build=0&surface=${surface}`, [intro, list, end]);
      const initial = overflowChecks.mock.calls.length;
      expect(initial).toBeGreaterThan(0);
      press('s');
      expect(overflowChecks.mock.calls.length).toBe(initial);
      press('ArrowRight');
      expect(overflowChecks.mock.calls.length).toBeGreaterThan(initial);
    }
  );
});
