/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slidesPack } from './pack';
import { resolveSlideRenders } from './resolve_renders';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

const slide = (body: unknown[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const title = slide([{ type: 'slideHeading', title: 'Basket' }]);

const renderOf = (slug: string) => ({
  type: 'slideSplit',
  left: { items: ['Source'] },
  right: { items: [{ type: 'slideRender', slide: slug, surface: 'svg' }] },
});

describe('resolveSlideRenders', () => {
  it('fills a referenced slide’s composition in, through containers', () => {
    const [, resolved] = resolveSlideRenders([
      { slug: 'title', composition: title },
      { slug: 'proof', composition: slide([renderOf('title')]) },
    ]);
    expect(resolved).toMatchObject({
      body: [
        {
          body: [
            {
              right: {
                items: [
                  { type: 'slideRender', slide: 'title', composition: title },
                ],
              },
            },
          ],
        },
      ],
    });
    expect(runtime.validate(resolved!).errors).toEqual([]);
  });

  it('leaves slides without a render, and filled renders, as they are', () => {
    const filled = slide([
      { type: 'slideRender', slide: 'x', composition: title, surface: 'text' },
    ]);
    const [first, second] = resolveSlideRenders([
      { slug: 'title', composition: title },
      { slug: 'filled', composition: filled },
    ]);
    expect(first).toEqual(title);
    expect(second).toEqual(filled);
  });

  it('rejects an unknown slug', () => {
    expect(() =>
      resolveSlideRenders([
        { slug: 'proof', composition: slide([renderOf('nope')]) },
      ])
    ).toThrow('slide "proof" renders unknown slide "nope"');
  });

  it('leaves what it cannot fill when asked to', () => {
    const proof = slide([renderOf('nope')]);
    const [resolved] = resolveSlideRenders(
      [{ slug: 'proof', composition: proof }],
      {
        onUnresolved: 'leave',
      }
    );
    expect(resolved).toEqual(proof);
  });

  it('rejects a slide that renders itself', () => {
    expect(() =>
      resolveSlideRenders([
        { slug: 'loop', composition: slide([renderOf('loop')]) },
      ])
    ).toThrow('slide "loop" renders itself');
  });

  it('rejects a cycle and a render of a render', () => {
    expect(() =>
      resolveSlideRenders([
        { slug: 'a', composition: slide([renderOf('b')]) },
        { slug: 'b', composition: slide([renderOf('a')]) },
      ])
    ).toThrow('an embedded composition cannot embed another render');
    expect(() =>
      resolveSlideRenders([
        { slug: 'title', composition: title },
        { slug: 'b', composition: slide([renderOf('title')]) },
        { slug: 'c', composition: slide([renderOf('b')]) },
      ])
    ).toThrow('slide "c" renders slide "b", which holds a render of its own');
  });

  it.each(['throw', 'leave'] as const)(
    'rejects a slug named twice, with onUnresolved %s',
    (onUnresolved) => {
      expect(() =>
        resolveSlideRenders(
          [
            { slug: 'title', composition: title },
            { slug: 'title', composition: slide([renderOf('title')]) },
          ],
          { onUnresolved }
        )
      ).toThrow('resolveSlideRenders: slug "title" names more than one slide');
    }
  );

  it('quotes a slug on one line in its messages', () => {
    const slug = 'a"b\nc\u2028d';
    expect(() =>
      resolveSlideRenders([{ slug, composition: slide([renderOf('nope')]) }])
    ).toThrow('slide "a\\"b\\nc\\u2028d" renders unknown slide "nope"');
    expect(() =>
      resolveSlideRenders([{ slug, composition: slide([renderOf(slug)]) }])
    ).toThrow('slide "a\\"b\\nc\\u2028d" renders itself');
  });
});
