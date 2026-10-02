/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  createPrimitiveDispatcher,
  type PrimitiveNode,
  type ValidationError,
} from '@elastic/isomer-sdk';
import { runPrimitiveInventoryConformance } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDeckPrimitives } from '../../registry';

import { example, terminalExample } from './examples';
import { slideWindowPrimitive } from './index';
import { windowBodyLayout, windowNodeLayout } from './layout';
import type { SlideWindowNode } from './types';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorsOf = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideWindow schema', () => {
  it('rejects a window inside a window, at any depth', () => {
    expect(errorsOf({ ...example, body: [terminalExample] })).toContain(
      'body[0].body[0].body: a window cannot hold another window'
    );
    expect(
      errorsOf({
        ...example,
        body: [{ type: 'slideStack', items: [terminalExample] }],
      })
    ).toContain('body[0].body[0].body: a window cannot hold another window');
  });

  it('rejects a frame and an empty body', () => {
    expect(
      errorsOf({ ...example, body: [{ type: 'slideFrame', body: [] }] })
    ).toContainEqual(expect.stringMatching(/^body\[0\]\.body\[0\]\.body\[0\]/));
    expect(errorsOf({ ...example, body: [] })).toContainEqual(
      expect.stringMatching(/^body\[0\]\.body\[0\]\.body/)
    );
  });

  describe('a window chain deeper than the call stack', () => {
    let deep: object = { type: 'slideHeading', title: 'Inside' };
    for (let level = 0; level < 100_000; level += 1) {
      deep = { ...example, body: [deep] };
    }

    it('is refused by its own schema, without parsing the chain', () => {
      const errors: ValidationError[] = [];
      createPrimitiveDispatcher(slideDeckPrimitives).validate(
        deep as PrimitiveNode,
        'body[0]',
        errors
      );
      expect(errors.map(({ path, message }) => `${path}: ${message}`)).toEqual([
        'body[0].body: a window cannot hold another window',
      ]);
    });

    it('is refused by the input budget in parse and validate', () => {
      for (const { errors } of [
        runtime.parse(compose(deep)),
        runtime.validate(compose(deep)),
      ]) {
        expect(errors).toMatchObject([{ code: 'INPUT_OVER_BUDGET' }]);
      }
    });

    it('is refused as a catalog example by inventory conformance', () => {
      expect(() =>
        runPrimitiveInventoryConformance(
          slideDeckPrimitives.map((definition) =>
            definition.type === 'slideWindow'
              ? {
                  ...definition,
                  catalog: { ...definition.catalog, example: deep },
                }
              : definition
          )
        )
      ).toThrow('slideWindow catalog.example must be within the input budget');
    });
  });

  it('walks its body', () => {
    expect(
      slideWindowPrimitive.children?.(example).map(({ path }) => path)
    ).toEqual(['body[0]']);
  });
});

describe('slideWindow layout', () => {
  it('gives its body the room inside its border, title bar, and padding', () => {
    const room = { width: 1000, height: 600 };
    const of = (chrome: SlideWindowNode['chrome'], title = 'shop.example') =>
      windowBodyLayout(room, { ...example, chrome, title });
    expect(of('browser')).toEqual({ width: 949, height: 505.9 });
    expect(of('terminal')).toEqual(of('chat'));
    expect(of('slack')).toEqual({ width: 941, height: 471.1 });
    expect(
      windowBodyLayout(
        { width: 40, height: 40 },
        { ...example, chrome: 'chat' }
      )
    ).toEqual({ width: 0, height: 0 });
  });

  it('leaves less room under a title that wraps across its bar', () => {
    const room = { width: 1000, height: 600 };
    const long = 'https://shop.example/'.repeat(8);
    for (const chrome of ['browser', 'slack'] as const) {
      expect(
        windowBodyLayout(room, { ...example, chrome, title: long }).height
      ).toBeLessThan(
        windowBodyLayout(room, { ...example, chrome, title: 'shop' }).height
      );
    }
  });

  it('gives a node below a leading heading the height the heading and gap leave', () => {
    const room = { width: 1000, height: 600 };
    const node: SlideWindowNode = {
      ...example,
      body: [
        { type: 'slideHeading', title: 'Checkout', lede: 'Two releases.' },
        { type: 'slideBulletList', items: ['One'] },
        { type: 'slideBulletList', items: ['Two'] },
      ],
    };
    const inner = windowBodyLayout(room, node);
    expect(windowNodeLayout(room, node, 0)).toEqual(inner);
    const below = windowNodeLayout(room, node, 1);
    expect(below.width).toBe(inner.width);
    expect(below.height).toBeLessThan(inner.height);
    expect(windowNodeLayout(room, node, 2)).toEqual(below);
  });
});

describe('slideWindow output', () => {
  it('names a Slack window as a channel on every surface', () => {
    expect(runtime.surfaces.text.renderNode(example)).toMatchInlineSnapshot(`
      "# checkout-oncall

      IN THE SPRING RELEASE
      ✓ Saved carts across devices.
      ✓ Apple Pay at checkout."
    `);
    expect(runtime.surfaces.markdown.renderNode(example))
      .toMatchInlineSnapshot(`
      "**# checkout-oncall**

      **IN THE SPRING RELEASE**

      - ✓ Saved carts across devices.
      - ✓ Apple Pay at checkout."
    `);
    expect(runtime.surfaces.slack.renderNode(example).blocks[0])
      .toMatchInlineSnapshot(`
      {
        "elements": [
          {
            "text": "*# checkout-oncall*",
            "type": "mrkdwn",
          },
        ],
        "type": "context",
      }
    `);
    expect(runtime.surfaces.html.render(compose(example)).html).toContain(
      '# checkout-oncall'
    );
  });

  it('shows another app’s title as authored', () => {
    expect(
      runtime.surfaces.text.renderNode(terminalExample).split('\n')[0]
    ).toBe('~/shop — release');
  });
});

describe('slideWindow JSX', () => {
  it('fills its body from its own children', () => {
    const {
      Composition: View,
      SlideBulletList,
      SlideWindow,
      toComposition,
    } = slideJsx;
    const composition = toComposition(
      createElement(
        View,
        null,
        createElement(
          SlideWindow,
          { chrome: 'terminal', title: 'deploy.sh' },
          createElement(SlideBulletList, { items: ['Shipped.'] })
        )
      )
    );
    expect(composition.body[0]).toEqual({
      type: 'slideWindow',
      chrome: 'terminal',
      title: 'deploy.sh',
      body: [{ type: 'slideBulletList', items: ['Shipped.'] }],
    });
  });
});
