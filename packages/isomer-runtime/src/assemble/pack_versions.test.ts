/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Composition,
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
  z,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './runtime';

const note = definePrimitive<PrimitiveNode>({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  },
  examples: [],
  schema: z.object({ type: z.literal('note') }),
  renderers: { react: () => null, text: () => 'note', markdown: () => [] },
});

const runtimeAt = (version: number) =>
  createIsomerRuntime({
    packs: [definePrimitivePack({ id: 'notes', version, primitives: [note] })],
  });

const composition: Composition = { type: 'view', body: [{ type: 'note' }] };

describe('pack versions', () => {
  it('reports its packs’ versions', () => {
    const runtime = runtimeAt(2);
    expect(runtime.packVersions).toEqual({ notes: 2 });
    expect(runtime.getCapabilities().packs).toEqual({ notes: 2 });
  });

  it('stamps a composition that then validates and matches', () => {
    const runtime = runtimeAt(2);
    const stamped = runtime.stamp(composition);
    expect(stamped.packs).toEqual({ notes: 2 });
    expect(runtime.validate(stamped).valid).toBe(true);
    expect(runtime.checkPackVersions(stamped)).toEqual([]);
  });

  it('reports a composition stamped by another version', () => {
    const stamped = runtimeAt(3).stamp(composition);
    expect(runtimeAt(2).checkPackVersions(stamped)).toEqual([
      { pack: 'notes', kind: 'newer', stamped: 3, held: 2 },
    ]);
    expect(runtimeAt(4).checkPackVersions(stamped)).toEqual([
      { pack: 'notes', kind: 'older', stamped: 3, held: 4 },
    ]);
  });

  it('reports an unstamped composition that uses a pack', () => {
    expect(runtimeAt(1).checkPackVersions(composition)).toEqual([
      { pack: 'notes', kind: 'unstamped', held: 1 },
    ]);
  });

  it('renders a stamped composition unchanged', () => {
    const runtime = runtimeAt(1);
    expect(runtime.surfaces.text.render(runtime.stamp(composition))).toBe(
      runtime.surfaces.text.render(composition)
    );
  });
});
