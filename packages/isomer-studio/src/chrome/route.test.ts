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

  it('falls back to the first primitive for an unknown app', () => {
    expect(parseLocation('#/app/gone/a', docs, ['deck'])).toEqual(first);
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
    expect(result.current.location).toEqual(first);
    expect(window.location.hash).toBe(formatLocation(first));
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
