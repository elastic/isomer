/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { withContextFields } from './context_view';

class Context {
  layout?: { width: number };
  logo?: boolean;
  readonly #name = 'context';

  describe() {
    return this.#name;
  }
}

describe('withContextFields', () => {
  it('reads the fields and keeps a class instance working', () => {
    const view = withContextFields(new Context(), { logo: false });
    expect(view.logo).toBe(false);
    expect(view).toBeInstanceOf(Context);
    expect(view.describe()).toBe('context');
  });

  it('layers views and keeps the fields when spread', () => {
    const view = withContextFields(
      withContextFields(new Context(), { logo: false }),
      { layout: { width: 2 } }
    );
    expect(view.describe()).toBe('context');
    expect({ ...view }).toEqual({ logo: false, layout: { width: 2 } });
  });

  it('works on a frozen context and leaves it untouched', () => {
    const frozen: { logo: boolean } = Object.freeze({ logo: true });
    expect(withContextFields(frozen, { logo: false }).logo).toBe(false);
    expect(frozen.logo).toBe(true);
  });

  it('makes a plain context from the fields when there is none', () => {
    expect(withContextFields<Context>(undefined, { logo: false })).toEqual({
      logo: false,
    });
  });
});
