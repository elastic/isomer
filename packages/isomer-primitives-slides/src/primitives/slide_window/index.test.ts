/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';

import { example, terminalExample } from './examples';
import { slideWindowPrimitive } from './index';

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

  it('walks its body', () => {
    expect(
      slideWindowPrimitive.children?.(example).map(({ path }) => path)
    ).toEqual(['body[0]']);
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
