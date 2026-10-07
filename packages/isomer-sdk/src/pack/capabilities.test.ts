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
  it('reports per-primitive support for each format the caller names', () => {
    const pack = definePrimitivePack({
      id: 'mixed',
      surfaces: ['slack'],
      primitives: [leaf('card', true), leaf('memo', false)],
    });

    expect(
      describeCapabilities([pack], ['markdown', 'slack', 'png']).support
    ).toEqual({
      card: { markdown: 'native', slack: 'native', png: 'native' },
      memo: { markdown: 'native', slack: 'fallback', png: 'native' },
    });
  });
});
