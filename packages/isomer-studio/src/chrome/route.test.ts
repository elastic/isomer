/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { definePrimitivePack } from '@elastic/isomer-sdk';
import { act, renderHook } from '@testing-library/react';

import { callout, componentsPack, divider } from '../fixtures/components_pack';
import { describeRuntime } from '../model/describe_runtime';

import {
  formatLocation,
  formatRoute,
  HOME,
  parseLocation,
  parseRoute,
  useStudioRoute,
} from './route';

const docs = describeRuntime(
  createIsomerRuntime<unknown, StyledRenderContext>({ packs: [componentsPack] })
);
const first = parseRoute('', docs);

describe('parseLocation', () => {
  it('reads an app route, keeping slashes in its path', () => {
    expect(parseLocation('#/app/deck/a/b/3', docs, ['deck'])).toEqual({
      app: 'deck',
      path: 'a/b/3',
    });
    expect(parseLocation('#/app/deck', docs, ['deck'])).toEqual({
      app: 'deck',
      path: '',
    });
  });

  it('encodes an app path in the hash and decodes it back', () => {
    const location = { app: 'deck', path: 'my deck/50%/a#b?c' };
    expect(formatLocation(location)).toBe(
      '#/app/deck/my%20deck/50%25/a%23b%3Fc'
    );
    expect(parseLocation(formatLocation(location), docs, ['deck'])).toEqual(
      location
    );
    expect(parseLocation('#/app/deck/100%', docs, ['deck'])).toEqual({
      app: 'deck',
      path: '100%',
    });
  });

  it('opens Home for an unknown app, an empty hash, #/home, or an unknown first segment', () => {
    expect(parseLocation('#/app/gone/a', docs, ['deck'])).toEqual(HOME);
    expect(parseLocation('#/app', docs, ['deck'])).toEqual(HOME);
    for (const hash of ['', '#', '#/', '#/home', '#/nope/callout']) {
      expect(parseLocation(hash, docs, ['deck'])).toEqual(HOME);
    }
    expect(formatLocation(HOME)).toBe('#/home');
  });

  it('reads a gallery group from the hash and drops one it does not know', () => {
    const grouped = parseRoute('#/docs/gallery/Data%20display', docs);
    expect(grouped).toEqual({
      mode: 'docs',
      page: 'gallery',
      example: 0,
      group: 'Data display',
    });
    expect(formatRoute(grouped)).toBe('#/docs/gallery/Data%20display');
    expect(parseRoute('#/docs/gallery/Nope', docs)).toEqual({
      mode: 'docs',
      page: 'gallery',
      example: 0,
    });
  });

  it('reads primitive routes as parseRoute does', () => {
    expect(parseLocation('#/docs/divider', docs, ['deck'])).toEqual(
      parseRoute('#/docs/divider', docs)
    );
  });

  it('round-trips both kinds through formatLocation', () => {
    for (const location of [
      { app: 'deck', path: 'a/b' },
      { app: 'deck', path: '' },
      { mode: 'docs', page: 'divider', example: 0 } as const,
      { mode: 'dev', page: 'callout', example: 1 } as const,
      HOME,
    ]) {
      expect(parseLocation(formatLocation(location), docs, ['deck'])).toEqual(
        location
      );
    }
  });
});

describe('useStudioRoute', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('remembers the primitive route while an app is open', () => {
    const { result } = renderHook(() => useStudioRoute(docs, ['deck']));
    act(() => result.current.navigate({ mode: 'docs', page: 'divider' }));
    act(() => result.current.openApp('deck', 'x/1'));

    expect(result.current.location).toEqual({ app: 'deck', path: 'x/1' });
    expect(window.location.hash).toBe('#/app/deck/x/1');
    expect(result.current.route).toMatchObject({
      mode: 'docs',
      page: 'divider',
    });

    act(() => result.current.navigate({ mode: 'dev' }));
    expect(result.current.location).toEqual({
      mode: 'dev',
      page: 'divider',
      example: 0,
    });
  });

  it('reads back the path it navigated to after the browser re-reads the hash', () => {
    const { result } = renderHook(() => useStudioRoute(docs, ['deck']));
    act(() => result.current.openApp('deck', 'my deck/2'));
    expect(window.location.hash).toBe('#/app/deck/my%20deck/2');
    expect(parseLocation(window.location.hash, docs, ['deck'])).toEqual(
      result.current.location
    );
  });

  it('starts on Home with the first primitive remembered, and goes home on request', () => {
    const { result } = renderHook(() => useStudioRoute(docs, ['deck']));
    expect(result.current.location).toEqual(HOME);
    expect(result.current.route).toEqual(first);

    act(() => result.current.navigate({ mode: 'docs', page: 'divider' }));
    expect(window.location.hash).toBe('#/docs/divider/0');
    act(() => result.current.goHome());
    expect(result.current.location).toEqual(HOME);
    expect(window.location.hash).toBe('#/home');
    expect(result.current.route).toMatchObject({
      mode: 'docs',
      page: 'divider',
    });
  });

  it('forgets a gallery group when navigating on from it', () => {
    window.location.hash = '#/docs/gallery/Data%20display';
    const { result } = renderHook(() => useStudioRoute(docs, []));
    expect(result.current.route.group).toBe('Data display');
    act(() => result.current.navigate({ page: 'callout' }));
    expect(window.location.hash).toBe('#/docs/callout/0');
    expect(result.current.route.group).toBeUndefined();
  });

  it('starts on the first primitive when the hash opens an app', () => {
    window.location.hash = '#/app/deck/a';
    const { result } = renderHook(() => useStudioRoute(docs, ['deck']));
    expect(result.current.location).toEqual({ app: 'deck', path: 'a' });
    expect(result.current.route).toEqual(first);
  });

  it('replaces the hash when the open app or primitive goes away', () => {
    window.location.hash = '#/app/deck/a';
    const length = window.history.length;
    const { result, rerender } = renderHook(
      ({ ids }) => useStudioRoute(docs, ids),
      { initialProps: { ids: ['deck'] } }
    );

    rerender({ ids: ['other'] });
    expect(result.current.location).toEqual(HOME);
    expect(window.location.hash).toBe('#/home');
    expect(window.history.length).toBe(length);

    const fewer = describeRuntime(
      createIsomerRuntime<unknown, StyledRenderContext>({
        packs: [
          definePrimitivePack({ id: 'fewer', primitives: [callout, divider] }),
        ],
      })
    );
    const removed = renderHook(({ current }) => useStudioRoute(current, []), {
      initialProps: { current: docs },
    });
    act(() => removed.result.current.navigate({ page: 'health' }));
    removed.rerender({ current: fewer });
    expect(removed.result.current.location).toEqual(parseRoute('', fewer));
  });

  it('keeps the location object when nothing it names changed', () => {
    window.location.hash = '#/app/deck/a';
    const { result, rerender } = renderHook(
      ({ ids }) => useStudioRoute(docs, ids),
      { initialProps: { ids: ['deck'] } }
    );
    const before = result.current.location;
    rerender({ ids: ['deck'] });
    rerender({ ids: ['deck', 'other'] });
    expect(result.current.location).toBe(before);
  });
});
