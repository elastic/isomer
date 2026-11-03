/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { assertPackIconsValid } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { createChartsPack } from '../pack';

import { example, examples, textExample } from './examples';
import { resolveMetric } from './resolve';
import { metricSchema } from './schema';

const runtime = createIsomerRuntime({
  packs: [createChartsPack({ metric: () => null })],
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [node as PrimitiveNode],
});

const issues = (node: object) =>
  metricSchema
    .safeParse(node)
    .error?.issues.map(({ path, message }) => [path.join('.'), message]) ?? [];

const tile = (overrides: object) => ({
  type: 'metric',
  tiles: [{ key: 'a', value: 1, ...overrides }],
});

describe('metric schema', () => {
  it('accepts every example through the runtime', () => {
    for (const node of examples) {
      expect(runtime.validate(compose(node)).errors).toEqual([]);
    }
  });

  it('rejects duplicate keys', () => {
    expect(
      issues({
        type: 'metric',
        tiles: [
          { key: 'a', value: 1 },
          { key: 'a', value: 2 },
        ],
      })
    ).toEqual([['tiles.1.key', 'duplicate tile key `a`']]);
  });

  it('rejects an unknown color and a non-finite value', () => {
    const paths = (node: object) => issues(node).map(([path]) => path);
    expect(paths(tile({ color: 'teal' }))).toEqual(['tiles.0.color']);
    expect(paths(tile({ value: Infinity }))).toEqual(['tiles.0.value']);
  });
});

describe('resolveMetric', () => {
  it('formats the value and picks text that reads on the fill', () => {
    const [requests] = resolveMetric(example).tiles;
    expect(requests).toMatchObject({
      value: '182,340',
      number: 182_340,
      fill: '#0B64DD',
    });
    expect(requests!.text.title).toBe('#E3E8F2');
  });

  it('paints the value instead of the tile, and reads a missing value as N/A', () => {
    const [country, latency] = resolveMetric(textExample).tiles;
    expect(country).toMatchObject({
      value: 'Portugal',
      fill: '#A6EDEA',
      number: undefined,
    });
    expect(latency).toMatchObject({
      value: 'N/A',
      fill: '#FFFFFF',
      valueColor: '#EE4C48',
    });
  });

  it('fills layout defaults and limits columns to the tiles', () => {
    expect(resolveMetric(textExample)).toMatchObject({
      columns: 2,
      layout: {
        titleAlign: 'left',
        valueAlign: 'right',
        valuePosition: 'bottom',
      },
    });
  });
});

describe('metric limits', () => {
  it('draws an empty grid', () => {
    expect(issues({ type: 'metric', tiles: [] })).toEqual([]);
    expect(resolveMetric({ type: 'metric', tiles: [] })).toMatchObject({
      columns: 1,
      tiles: [],
    });
  });

  it('takes long text and many tiles up to one pack-wide cap', () => {
    expect(issues(tile({ title: 'x'.repeat(10_000) }))).toEqual([]);
    expect(issues(tile({ title: 'x'.repeat(10_001) }))).toHaveLength(1);
    const tiles = Array.from({ length: 10_000 }, (_, i) => ({
      key: String(i),
      value: i,
    }));
    expect(issues({ type: 'metric', tiles, columns: 500 })).toEqual([]);
  });

  it('reads an empty grid as no text', () => {
    expect(
      runtime.surfaces.text.renderNode({
        type: 'metric',
        tiles: [],
      } as PrimitiveNode)
    ).toBe('');
  });
});

describe('metric text and markdown', () => {
  it('reads every tile', () => {
    expect(runtime.surfaces.text.renderNode(textExample as PrimitiveNode))
      .toMatchInlineSnapshot(`
      "Top country, Portugal
      p99 latency, N/A"
    `);
    expect(
      runtime.surfaces.markdown.renderNode(example as PrimitiveNode)
    ).toMatchInlineSnapshot(`"**Requests**: Last 24 hours, 182,340"`);
  });
});

describe('charts pack', () => {
  it('has a valid icon for every primitive', () => {
    expect(() =>
      assertPackIconsValid(createChartsPack({ metric: () => null }))
    ).not.toThrow();
  });
});
