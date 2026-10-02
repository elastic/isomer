/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { EnhancementDefinition } from '../../pack/enhancements';
import { nodeAnchor, withoutAnchors } from '../anchors';

import { applyEnhancements } from './enhancements';

const body = [{ type: 'leaf' }];
const walk = () => [];

const definition = (
  id: string,
  extra: Partial<EnhancementDefinition> = {}
): EnhancementDefinition => ({ id, appliesTo: () => true, ...extra });

class HostContext {
  #secret = 'kept';
  read(): string {
    return this.#secret;
  }
}

describe('applyEnhancements', () => {
  it('keeps the first applying definition of each id', () => {
    const first = definition('a');
    const { context, applied } = applyEnhancements({}, body, walk, [
      definition('skipped', { appliesTo: () => false }),
      first,
      definition('a'),
    ]);
    expect(applied).toEqual([first]);
    expect((context as { enhancements: Set<string> }).enhancements).toEqual(
      new Set(['a'])
    );
  });

  it('limits the applied definitions, ids, and anchors to requested ids', () => {
    const wanted = definition('wanted');
    const node = { type: 'leaf' };
    const { context, applied } = applyEnhancements(
      {},
      body,
      walk,
      [wanted, definition('anchored', { anchors: true })],
      ['wanted']
    );
    expect(applied).toEqual([wanted]);
    expect((context as { enhancements: Set<string> }).enhancements).toEqual(
      new Set(['wanted'])
    );
    expect(nodeAnchor(context, node)).toEqual({});
  });

  it('turns anchors on only when an applied definition asks', () => {
    const node = { type: 'leaf' };
    const off = applyEnhancements({}, body, walk, [definition('a')]);
    const on = applyEnhancements({}, body, walk, [
      definition('a', { anchors: true }),
    ]);
    expect(nodeAnchor(off.context, node)).toEqual({});
    expect(nodeAnchor(on.context, node)).not.toEqual({});
  });

  it('views the host context rather than copying it', () => {
    const host = new HostContext();
    const { context } = applyEnhancements(host, body, walk, [
      definition('a', { anchors: true }),
    ]);
    expect(context).toBeInstanceOf(HostContext);
    expect(context.read()).toBe('kept');
  });

  it('cannot turn anchors back on under withoutAnchors', () => {
    const { context } = applyEnhancements(withoutAnchors({}), body, walk, [
      definition('a', { anchors: true }),
    ]);
    expect(nodeAnchor(context, { type: 'leaf' })).toEqual({});
  });
});
