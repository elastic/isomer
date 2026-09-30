/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { pairExample } from './examples';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

describe('slideRenderGrid', () => {
  it('shows each surface once, in two to six tiles', () => {
    const [tile] = pairExample.tiles;
    expect(
      schema.safeParse({ ...pairExample, tiles: [tile, tile] }).error?.issues
    ).toContainEqual(
      expect.objectContaining({ message: 'each surface may appear once' })
    );
    expect(schema.safeParse({ ...pairExample, tiles: [tile] }).success).toBe(
      false
    );
  });

  it('lists its tiles, then quotes the drawn slide once', () => {
    expect(runtime.surfaces.markdown.renderNode(pairExample as PrimitiveNode))
      .toMatchInlineSnapshot(`
      "- **react** · Inside the ops dashboard
      - **text** · Driver SMS

      > # Orders now arrive in under 30 minutes
      >
      > Routing from the nearest store cut the median wait by eleven minutes.
      >
      > _Basket · 02 Operations_"
    `);
  });
});
