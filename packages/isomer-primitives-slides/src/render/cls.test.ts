/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/distillate';
import { describe, expect, it } from 'vitest';

import { cls } from './cls';

const handle = (readableName: string) => ({ readableName }) as StyleHandle;

class Context {
  readonly #prefix = 'x-';

  resolveClassName(...handles: Pick<StyleHandle, 'readableName'>[]) {
    return handles
      .map(({ readableName }) => `${this.#prefix}${readableName}`)
      .join(' ');
  }
}

describe('cls', () => {
  it('resolves through a class-instance context', () => {
    expect(cls(new Context(), handle('a'), undefined, handle('b'))).toBe(
      'x-a x-b'
    );
  });

  it('falls back to readable names without a context', () => {
    expect(cls(undefined, handle('a'), handle('b'))).toBe('a b');
  });
});
