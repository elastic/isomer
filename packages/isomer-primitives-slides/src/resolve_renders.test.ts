/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { type NamedSlide, resolveSlideRenders } from './resolve_renders';

const frame = (...body: object[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body } as PrimitiveNode],
});

const heading = { type: 'slideHeading', title: 'Target' };
const renderOf = (slide: string) => ({
  type: 'slideRender',
  slide,
  surface: 'svg',
});

const bodyOf = ({ body }: Composition) =>
  (body[0] as unknown as { body: Record<string, unknown>[] }).body;

describe('resolveSlideRenders', () => {
  it('fills a referenced slide’s body, nested ones included', () => {
    const target: NamedSlide = { slug: 'target', composition: frame(heading) };
    const [, host] = resolveSlideRenders([
      target,
      {
        slug: 'host',
        composition: frame(renderOf('target'), {
          type: 'slideAnnotatedRender',
          render: renderOf('target'),
          pins: [{ x: 1, y: 1, title: 'A', body: 'B' }],
        }),
      },
    ]);
    const [render, annotated] = bodyOf(host!);
    expect(render).toEqual({
      ...renderOf('target'),
      body: target.composition.body,
    });
    expect((annotated!.render as { body: unknown }).body).toBe(
      target.composition.body
    );
  });

  it('rejects an unknown slug, a slide rendering itself, and a nested render', () => {
    expect(() =>
      resolveSlideRenders([{ slug: 'a', composition: frame(renderOf('b')) }])
    ).toThrow('slide "a" renders unknown slide "b"');
    expect(() =>
      resolveSlideRenders([{ slug: 'a', composition: frame(renderOf('a')) }])
    ).toThrow('slide "a" renders itself');
    expect(() =>
      resolveSlideRenders([
        { slug: 'a', composition: frame(renderOf('b')) },
        { slug: 'b', composition: frame(renderOf('c')) },
        { slug: 'c', composition: frame(heading) },
      ])
    ).toThrow('slide "a" renders slide "b", which holds a render of its own');
  });

  it('leaves what it cannot fill as a placeholder when asked', () => {
    const [slide] = resolveSlideRenders(
      [{ slug: 'a', composition: frame(renderOf('b')) }],
      { onUnresolved: 'leave' }
    );
    expect(bodyOf(slide!)[0]).toEqual(renderOf('b'));
  });

  it('throws on a slug naming two slides, whatever onUnresolved says', () => {
    expect(() =>
      resolveSlideRenders(
        [
          { slug: 'a', composition: frame(heading) },
          { slug: 'a', composition: frame(heading) },
        ],
        { onUnresolved: 'leave' }
      )
    ).toThrow('slug "a" names more than one slide');
  });
});
