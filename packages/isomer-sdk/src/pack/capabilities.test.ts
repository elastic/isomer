/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  definePrimitive,
  type PrimitiveNode,
} from '../define/primitive_module';

import { describeCapabilities } from './capabilities';
import { definePrimitivePack } from './primitive_pack';

const leaf = (type: string, withSlack: boolean) =>
  definePrimitive<PrimitiveNode>({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema: z.object({ type: z.literal(type) }),
    renderers: {
      react: () => null,
      text: () => '',
      markdown: () => [],
      ...(withSlack ? { slack: () => [] } : {}),
    },
  });

describe('describeCapabilities', () => {
  const pack = definePrimitivePack({
    id: 'mixed',
    surfaces: ['slack'],
    primitives: [leaf('card', true), leaf('memo', false)],
  });

  it('reports per-primitive support for each surface the caller names', () => {
    expect(
      describeCapabilities([pack], {
        surfaces: ['markdown', 'slack', 'snapshot'],
        formats: ['png'],
      }).support
    ).toEqual({
      card: { markdown: 'native', slack: 'native', snapshot: 'native' },
      memo: { markdown: 'native', slack: 'fallback', snapshot: 'native' },
    });
  });

  it('reports every surface but snapshot as a format, then the added ones once', () => {
    const { surfaces, formats } = describeCapabilities([pack], {
      surfaces: ['markdown', 'slack', 'snapshot'],
      formats: ['png', 'svg', 'slack', 'snapshot'],
    });

    expect(surfaces).toEqual(['markdown', 'slack', 'snapshot']);
    expect(formats).toEqual(['markdown', 'slack', 'png', 'svg']);
  });
});
