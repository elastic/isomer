/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { contextWith } from './context_view';

class Host {
  readonly #scheme = 'dark';
  readonly size = { width: 1, height: 1 };
  get scheme() {
    return this.#scheme;
  }
  label() {
    return `${this.#scheme} ${this.size.width}`;
  }
}

describe('contextWith', () => {
  it('replaces one field and keeps getters, private state, methods and the prototype', () => {
    const view = contextWith(Object.freeze(new Host()), 'size', {
      width: 2,
      height: 2,
    });
    expect(view.size).toEqual({ width: 2, height: 2 });
    expect(view.scheme).toBe('dark');
    expect(view.label()).toBe('dark 1');
    expect(view).toBeInstanceOf(Host);
  });

  it('gives each method one identity', () => {
    const view = contextWith(new Host(), 'size', { width: 2, height: 2 });
    expect(Reflect.get(view, 'label')).toBe(Reflect.get(view, 'label'));
  });
});
