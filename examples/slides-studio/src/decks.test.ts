/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment happy-dom

import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DECK_GONE_EVENT } from '../common/events';

import { type LiveDeck, useDeck } from './decks';

class FakeEventSource extends EventTarget {
  static CLOSED = 2;
  static opened: FakeEventSource[] = [];
  readyState = 1;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn(() => {
    this.readyState = FakeEventSource.CLOSED;
  });

  constructor(readonly url: string) {
    super();
    FakeEventSource.opened.push(this);
  }
}

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const deck = { id: 'd1', title: 'Deck', slides: [], stored: [], updatedAt: '' };

describe('useDeck', () => {
  let seen: LiveDeck[];
  let unmount: () => void;

  beforeEach(() => {
    FakeEventSource.opened = [];
    vi.stubGlobal('EventSource', FakeEventSource);
    seen = [];
    const Probe = () => {
      seen.push(useDeck('d1'));
      return null;
    };
    const root = createRoot(document.createElement('div'));
    act(() => root.render(createElement(Probe)));
    unmount = () => act(() => root.unmount());
  });

  afterEach(() => {
    unmount();
    vi.unstubAllGlobals();
  });

  it('reports the deck missing and stops listening once it is removed', () => {
    const [source] = FakeEventSource.opened;
    expect(source?.url).toBe('/api/decks/d1/events');
    act(() => {
      source!.onopen?.();
      source!.onmessage?.(
        new MessageEvent('message', { data: JSON.stringify(deck) })
      );
    });
    expect(seen.at(-1)).toEqual({ deck, missing: false, live: true });
    act(() => {
      source!.dispatchEvent(new Event(DECK_GONE_EVENT));
    });
    expect(seen.at(-1)).toEqual({
      deck: undefined,
      missing: true,
      live: false,
    });
    expect(source!.close).toHaveBeenCalled();
  });
});
