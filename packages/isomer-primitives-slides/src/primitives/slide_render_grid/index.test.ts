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
import { openBody } from '../layout';
import { referenceRoom } from '../slide_heading/fit';

import { example, pairExample } from './examples';
import { fillsCell, shapeFor, tileScale } from './fit';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

describe('slideRenderGrid layout', () => {
  const underHeading = { ...openBody, height: referenceRoom };
  const grid = (count: number, caption = 'SMS') => ({
    type: 'slideRenderGrid' as const,
    body: pairExample.body,
    tiles: (['svg', 'text', 'markdown', 'slack', 'html', 'react'] as const)
      .slice(0, count)
      .map((surface) => ({ surface, caption })),
  });

  it('draws each tile no wider than its cell, capped at the shape’s scale', () => {
    expect(tileScale(grid(2), openBody)).toBe(0.42);
    expect(tileScale(grid(3), openBody)).toBe(0.27);
    expect(tileScale(grid(2), { ...openBody, width: 1000 })).toBeCloseTo(
      (1000 - 40) / 2 / 1920
    );
  });

  it('draws two rows no taller than half the room below the heading', () => {
    expect(tileScale(grid(4), openBody)).toBeLessThan(0.42);
    expect(tileScale(grid(4), underHeading)).toBeLessThan(
      tileScale(grid(4), openBody)
    );
    expect(tileScale(grid(6), underHeading)).toBe(
      tileScale(grid(4), underHeading)
    );
  });

  it('leaves room for a caption that wraps beside the surface name', () => {
    expect(tileScale(grid(4, 'SMS '.repeat(30)), underHeading)).toBeLessThan(
      tileScale(grid(4), underHeading)
    );
    expect(
      tileScale(grid(4, 'orders-admin-'.repeat(12)), underHeading)
    ).toBeLessThan(tileScale(grid(4), underHeading));
  });

  it('takes a shape from its tile count, and stretches panels only across two rows', () => {
    const shapes = [2, 3, 4, 5, 6].map(shapeFor);
    expect(shapes).toEqual([
      'twoByOne',
      'threeByOne',
      'twoByTwo',
      'threeByTwo',
      'threeByTwo',
    ]);
    expect(shapes.map(fillsCell)).toEqual([false, false, true, true, true]);
  });
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

  it('takes at most six tiles and needs a body', () => {
    const [tile] = example.tiles;
    expect(schema.safeParse(example).success).toBe(true);
    expect(
      schema.safeParse({ ...example, tiles: [...example.tiles, tile] }).error
        ?.issues
    ).toContainEqual(expect.objectContaining({ code: 'too_big' }));
    expect(schema.safeParse({ ...example, body: [] }).success).toBe(false);
  });

  it('reports a surface that is not one once, not as a repeat', () => {
    const unknown = { surface: 'pdf', caption: 'Print' };
    expect(
      schema
        .safeParse({ ...pairExample, tiles: [unknown, unknown] })
        .error?.issues.map(({ path }) => path.join('.'))
    ).toEqual(['tiles.0.surface', 'tiles.1.surface']);
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

  it('ends at its tiles on text when text shows nothing of the slide', () => {
    const node = {
      ...pairExample,
      body: [{ type: 'slideStatement', text: 'Drawn only', surfaces: ['svg'] }],
    };
    expect(runtime.surfaces.text.renderNode(node as PrimitiveNode)).toBe(
      'react · Inside the ops dashboard\ntext · Driver SMS'
    );
  });
});
