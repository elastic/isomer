/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

describe('browser storage', () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('uses jsdom storage for both global and window access', () => {
    for (const kind of ['localStorage', 'sessionStorage'] as const) {
      expect(globalThis[kind]).toBe(jsdom.window[kind]);
      expect(window[kind]).toBe(jsdom.window[kind]);
    }
    localStorage.setItem('draft', 'saved');
    sessionStorage.setItem('draft', 'temporary');
    expect(jsdom.window.localStorage.getItem('draft')).toBe('saved');
    expect(jsdom.window.sessionStorage.getItem('draft')).toBe('temporary');
    expect(localStorage).not.toBe(sessionStorage);
  });

  it('keeps jsdom storage after restoring a stubbed global', () => {
    for (const kind of ['localStorage', 'sessionStorage'] as const) {
      vi.stubGlobal(kind, undefined);
    }
    vi.unstubAllGlobals();
    expect(localStorage).toBe(jsdom.window.localStorage);
    expect(sessionStorage).toBe(jsdom.window.sessionStorage);
  });
});
