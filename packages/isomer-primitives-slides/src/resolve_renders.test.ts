/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  checkInputBudget,
  type Composition,
  MAX_INPUT_DEPTH,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckPrimitives } from './registry';
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
    expect((annotated!.render as { body: unknown }).body).toEqual(
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

  it('always throws on a slug naming two slides', () => {
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

  it('returns a slide the input budget refuses as it is when leaving, and throws otherwise', () => {
    let deep: object = heading;
    for (let level = 0; level < 100_000; level += 1) {
      deep = { type: 'slideStack', items: [deep] };
    }
    const slides = [
      { slug: 'host', composition: frame(renderOf('deep')) },
      { slug: 'deep', composition: frame(deep) },
    ];
    const [host, left] = resolveSlideRenders(slides, { onUnresolved: 'leave' });
    expect(bodyOf(host!)[0]).toEqual(renderOf('deep'));
    expect(left).toBe(slides[1]!.composition);
    expect(() => resolveSlideRenders(slides.slice(1))).toThrow(
      `slide "deep" cannot be checked: input nests deeper than ${MAX_INPUT_DEPTH} levels`
    );
    expect(() => resolveSlideRenders(slides)).toThrow(
      `slide "host" renders slide "deep", which cannot be checked: input nests deeper than ${MAX_INPUT_DEPTH} levels`
    );
  });

  it('fills from a slide at the input budget’s depth and refuses one a level past it', () => {
    /** `count` slideStacks around `inner`: two levels each, under four of the composition's. */
    const chain = (count: number, inner: object): Composition => {
      let node = inner;
      for (let level = 0; level < count; level += 1) {
        node = { type: 'slideStack', items: [node] };
      }
      return frame(node);
    };
    const atLimit = chain(29, { type: 'slideBulletList', items: ['Last'] });
    const pastLimit = chain(30, heading);
    expect(checkInputBudget(atLimit).valid).toBe(true);
    expect(checkInputBudget(pastLimit)).toMatchObject({
      valid: false,
      error: { code: 'INPUT_OVER_BUDGET' },
    });
    const deck = (composition: Composition) => [
      { slug: 'host', composition: frame(renderOf('target')) },
      { slug: 'target', composition },
    ];
    const [host] = resolveSlideRenders(deck(atLimit));
    expect(bodyOf(host!)[0]).toEqual({
      ...renderOf('target'),
      body: atLimit.body,
    });
    expect(() => resolveSlideRenders(deck(pastLimit))).toThrow(
      `slide "host" renders slide "target", which cannot be checked: input nests deeper than ${MAX_INPUT_DEPTH} levels`
    );
    const [raised] = resolveSlideRenders(deck(pastLimit), {
      inputBudget: { depth: MAX_INPUT_DEPTH + 1 },
    });
    expect(bodyOf(raised!)[0]).toEqual({
      ...renderOf('target'),
      body: pastLimit.body,
    });
  });

  it('refuses a slide that is not plain data', () => {
    const slides = [
      { slug: 'a', composition: frame({ ...heading, title: () => 'Late' }) },
    ];
    expect(() => resolveSlideRenders(slides)).toThrow(
      'slide "a" cannot be checked: input holds a function, which is not plain data'
    );
  });

  it('fills a reference inside another pack’s container when given its primitives', () => {
    const box = {
      type: 'box',
      children: ({ items }: { items: PrimitiveNode[] }) =>
        items.map((node, index) => ({ node, path: `items[${index}]` })),
    };
    const slides = [
      { slug: 'target', composition: frame(heading) },
      {
        slug: 'host',
        composition: frame({ type: 'box', items: [renderOf('target')] }),
      },
    ];
    const inBox = (deck: Composition[]) =>
      (bodyOf(deck[1]!)[0] as { items: Record<string, unknown>[] }).items[0];
    expect(inBox(resolveSlideRenders(slides))).toEqual(renderOf('target'));
    expect(
      inBox(
        resolveSlideRenders(slides, {
          primitives: [...slideDeckPrimitives, box],
        })
      )
    ).toEqual({ ...renderOf('target'), body: slides[0]!.composition.body });
  });

  it('reads a render only in a child slot of the primitives it is given', () => {
    const box = {
      type: 'box',
      children: ({ items }: { items: PrimitiveNode[] }) =>
        items.map((node, index) => ({ node, path: `items[${index}]` })),
    };
    const fills = (target: object, primitives?: readonly object[]) => {
      const [, host] = resolveSlideRenders(
        [
          { slug: 'target', composition: frame(target) },
          { slug: 'host', composition: frame(renderOf('target')) },
        ],
        primitives
          ? { primitives: primitives as typeof slideDeckPrimitives }
          : {}
      );
      return 'body' in bodyOf(host!)[0]!;
    };
    const chart = { type: 'chart', config: { type: 'slideRender' } };
    const boxed = {
      type: 'box',
      items: [{ type: 'slideRender', surface: 'svg', body: [heading] }],
    };
    expect(fills(chart)).toBe(true);
    expect(fills(boxed)).toBe(true);
    expect(() => fills(boxed, [...slideDeckPrimitives, box])).toThrow(
      'which holds a render of its own'
    );
  });
});
