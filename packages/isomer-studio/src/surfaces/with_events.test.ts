/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it, vi } from 'vitest';

import { withEvents } from './with_events';

class Context {
  readonly #prefix = 'isomer';
  readonly anchors = true;
  resolveClassName(name: string) {
    return `${this.#prefix}-${name}`;
  }
  onEvent() {
    throw new Error('The host context raised the event.');
  }
}

describe('withEvents', () => {
  it('hands back the host context itself without an override', () => {
    const context = new Context();
    expect(withEvents(context, undefined)).toBe(context);
  });

  it("keeps a class context's methods and private fields, and routes events to the override", () => {
    const onEvent = vi.fn();
    const context = withEvents(new Context(), onEvent);
    // A private field throws unless the method runs on the host context.
    expect(context.resolveClassName('metric')).toBe('isomer-metric');
    expect(context.anchors).toBe(true);
    context.onEvent();
    expect(onEvent).toHaveBeenCalledTimes(1);
    expect(({ ...context } as Record<string, unknown>).onEvent).toBe(onEvent);
    expect('onEvent' in context).toBe(true);
  });
});
