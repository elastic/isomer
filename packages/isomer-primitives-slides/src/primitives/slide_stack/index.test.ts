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
import { slideStackPrimitive } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

/** Every string in Slack blocks, entity-decoded, so authored copy can be found in it. */
const slackText = (value: unknown): string =>
  JSON.stringify(value)
    .match(/"(?:[^"\\]|\\.)*"/g)
    ?.map((literal) => JSON.parse(literal) as string)
    .join('\n')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&') ?? '';

/** Keys whose values are enum choices, not authored copy. */
const enumKeys = new Set([
  'type',
  'chrome',
  'spacing',
  'tone',
  'language',
  'role',
  'format',
]);

const authored = (value: unknown, key = ''): string[] => {
  if (typeof value === 'string') {
    return enumKeys.has(key) || value === '' ? [] : [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => authored(entry));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => authored(v, k));
  }
  return [];
};

const parity = (node: PrimitiveNode, composition: Composition) => {
  const outputs = [
    runtime.surfaces.text.render(composition),
    runtime.surfaces.markdown.render(composition),
    slackText(runtime.surfaces.slack.render(composition).blocks),
  ];
  for (const value of authored(node)) {
    for (const output of outputs) {
      expect(output.toLowerCase()).toContain(value.toLowerCase());
    }
  }
};

describe('slideStack', () => {
  it('holds at least one item', () => {
    expect(schema.safeParse({ ...example, items: [] }).success).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it('walks its items', () => {
    expect(
      slideStackPrimitive.children?.(example).map(({ path }) => path)
    ).toEqual(['items[0]', 'items[1]']);
  });

  it('renders each item in order on every surface', () => {
    const composition = compose(example);
    const text = runtime.surfaces.text.render(composition);
    expect(text.indexOf('Cut the release branch')).toBeLessThan(
      text.indexOf('refund.ts')
    );
    const { blocks } = runtime.surfaces.slack.render(composition);
    expect(blocks.some((block) => block.type === 'table')).toBe(true);
  });

  it('reports an invalid item at its index', () => {
    const { errors } = runtime.validate(
      compose({
        ...example,
        items: [example.items[0], { type: 'slideCode', panels: [] }],
      } as PrimitiveNode)
    );
    expect(errors.map(({ path }) => path)).toContain(
      'body[0].body[0].items[1].panels'
    );
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'keeps every authored string on every surface (example %i)',
    (_index, node) => parity(node, compose(node))
  );
});
