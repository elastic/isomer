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

import { example, examples } from './examples';
import { markdown, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [node],
});

describe('slideLayers', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('holds three to six layers', () => {
    const [layer] = example.layers;
    expect(
      schema.safeParse({ ...example, layers: [layer, layer] }).success
    ).toBe(false);
    expect(
      schema.safeParse({ ...example, layers: Array(7).fill(layer) }).success
    ).toBe(false);
  });

  it('rejects a layer with both or neither of body and chips', () => {
    const [, layer, ...rest] = example.layers;
    for (const broken of [
      { ...layer, chips: ['nginx'] },
      { name: 'Gateway', owner: 'Platform' },
    ]) {
      const result = schema.safeParse({
        ...example,
        layers: [broken, layer, ...rest],
      });
      expect(result.error?.issues[0]).toMatchObject({
        path: ['layers', 0],
        message: 'a layer has exactly one of body or chips',
      });
    }
  });

  it('renders text and markdown top to bottom', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Apps — ios, android, web (Client team)
      Gateway — Routes, rate-limits, and authenticates every request (Platform)
      Services — Orders, catalog, and delivery slots, each deployed on its own (Product teams)
      Data — postgres, redis, kafka (Data team)
      Cloud — Compute, storage, and the network under all of it (Provider)"
    `);
    expect(markdown(example)).toMatchInlineSnapshot(`
      "1. **Apps** — \`ios\`, \`android\`, \`web\` · _Client team_
      2. **Gateway** — Routes, rate-limits, and authenticates every request · _Platform_
      3. **Services** — Orders, catalog, and **delivery slots**, each deployed on its own · _Product teams_
      4. **Data** — \`postgres\`, \`redis\`, \`kafka\` · _Data team_
      5. **Cloud** — Compute, storage, and the network under all of it · _Provider_"
    `);
  });
});
