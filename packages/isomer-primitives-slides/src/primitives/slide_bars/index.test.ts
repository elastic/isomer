/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { example, scaledExample } from './examples';
import { markdown, text } from './index';
import { schema, type SlideBarsNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const html = (node: SlideBarsNode): string =>
  runtime.surfaces.html.render({
    type: 'view',
    body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
  } satisfies Composition).html;

describe('slideBars', () => {
  it('rejects more than one highlighted item', () => {
    const [first, second, ...rest] = example.items;
    const result = schema.safeParse({
      ...example,
      items: [
        { ...first, highlight: true },
        { ...second, highlight: true },
        ...rest,
      ],
    });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['items'],
      message: 'at most one item can be highlighted',
    });
  });

  it('rejects a max below a value', () => {
    const result = schema.safeParse({ ...scaledExample, max: 50 });
    expect(result.error?.issues[0]).toMatchObject({
      path: ['max'],
      message: 'max must be at least every value',
    });
  });

  it('adds a Detail column only when an item has a detail', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Label    Value  Detail
      -------  -----  ----------------------
      Leeds    412    orders packed per hour
      Bristol  356    orders packed per hour
      Glasgow  298    orders packed per hour
      Cardiff  214    orders packed per hour
      Belfast  130    opened in March"
    `);
    expect(markdown(scaledExample)).toMatchInlineSnapshot(`
      "| Label | Value |
      | --- | --- |
      | Search | 92 |
      | Checkout | 88 |
      | Basket | 81 |
      | Account | 74 |
      | Reviews | 63 |
      | Wishlist | 51 |"
    `);
  });

  it('prints a value without float noise or an exponent on every surface', () => {
    const node: SlideBarsNode = {
      type: 'slideBars',
      items: [
        { label: 'Sum', value: 0.1 + 0.2 },
        { label: 'Huge', value: 1e21 },
        { label: 'Zero', value: -0 },
      ],
    };
    const huge = '1000000000000000000000';
    expect(text(node).split('\n').slice(2)).toEqual([
      'Sum    0.3',
      `Huge   ${huge}`,
      'Zero   0',
    ]);
    expect(markdown(node)).toContain(`| Sum | 0.3 |\n| Huge | ${huge} |`);
    const drawn = html(node);
    expect(drawn).toContain('>0.3<');
    expect(drawn).toContain(`>${huge}<`);
    expect(drawn).not.toMatch(/e\+21|0\.30000/);
  });

  it('draws every bar empty when every value is zero', () => {
    const drawn = html({
      type: 'slideBars',
      items: [
        { label: 'Monday', value: 0 },
        { label: 'Tuesday', value: 0 },
      ],
    });
    expect(drawn.match(/width:0%/g)).toHaveLength(2);
    expect(drawn).not.toContain('NaN');
  });
});
