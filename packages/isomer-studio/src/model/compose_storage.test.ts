/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isTrusted,
  loadDraft,
  rememberTrusted,
  saveDraft,
} from './compose_storage';

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('drafts', () => {
  it('round-trips the last draft', () => {
    expect(loadDraft()).toBeUndefined();
    saveDraft({ source: '<Composition />', format: 'jsx' });
    expect(loadDraft()).toEqual({ source: '<Composition />', format: 'jsx' });
  });

  it('ignores a malformed draft', () => {
    localStorage.setItem('isomer-studio:composition-draft', '{"source":1}');
    expect(loadDraft()).toBeUndefined();
    localStorage.setItem('isomer-studio:composition-draft', 'not json');
    expect(loadDraft()).toBeUndefined();
  });
});

describe('trusted sources', () => {
  it('trusts only the exact source and format this tab remembered', () => {
    const draft = { source: '<Composition />', format: 'jsx' as const };
    expect(isTrusted(draft)).toBe(false);
    rememberTrusted(draft);
    expect(isTrusted(draft)).toBe(true);
    expect(isTrusted({ ...draft, source: '<Composition/>' })).toBe(false);
    expect(isTrusted({ ...draft, format: 'json' })).toBe(false);
  });

  it('keeps the most recent twenty', () => {
    const drafts = Array.from({ length: 21 }, (_, index) => ({
      source: String(index),
      format: 'jsx' as const,
    }));
    drafts.forEach(rememberTrusted);
    expect(isTrusted(drafts[0]!)).toBe(false);
    expect(isTrusted(drafts[20]!)).toBe(true);
  });
});
