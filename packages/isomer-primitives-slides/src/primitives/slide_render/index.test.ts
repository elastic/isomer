/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  createChildNodeWalker,
  findNodeElementPairs,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDeckPrimitives } from '../../registry';
import { example as annotatedExample } from '../slide_annotated_render/examples';
import { example as gridExample } from '../slide_render_grid/examples';

import {
  bareExample,
  example,
  examples,
  markdownExample,
  placeholderExample,
} from './examples';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (...body: object[]): Composition => ({
  type: 'view',
  body: [
    {
      type: 'slideFrame',
      body: [{ type: 'slideHeading', title: 'Host' }, ...body],
    } as PrimitiveNode,
  ],
});

const errorsOf = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideRender schema', () => {
  it('needs a slide reference or a body', () => {
    expect(errorsOf({ type: 'slideRender', surface: 'svg' })).toEqual([
      'body[0].body[1].body: needs a `slide` reference or a `body`',
    ]);
    expect(errorsOf(placeholderExample)).toEqual([]);
  });

  it('embeds whole slides, but never another render', () => {
    expect(errorsOf(example)).toEqual([]);
    expect(
      errorsOf({
        ...bareExample,
        body: [{ type: 'slideStack', items: [placeholderExample] }],
      })
    ).toContainEqual(
      'body[0].body[1].body[0].items[0]: an embedded body cannot hold another render'
    );
  });

  it('keeps embedded ids its own', () => {
    const heading = { type: 'slideHeading', id: 'same', title: 'Twice' };
    expect(
      errorsOf({ type: 'slideRender', surface: 'svg', body: [heading] })
    ).toEqual([]);
    expect(
      runtime.validate(
        compose(heading, {
          type: 'slideRender',
          surface: 'svg',
          body: [heading],
        })
      ).errors
    ).toEqual([]);
  });
});

describe('slideRender anchors', () => {
  const walk = createChildNodeWalker(slideDeckPrimitives);

  it.each(
    [...examples, gridExample, annotatedExample].map((node) => [
      node.type,
      node,
    ])
  )(
    'pairs every host node beside a %s, and nothing embedded',
    (_type, node) => {
      const composition = compose(node, {
        type: 'slideBulletList',
        items: ['After'],
      });
      document.body.innerHTML = runtime.surfaces.html.render(composition, {
        anchors: true,
      }).html;
      const pairs = findNodeElementPairs(document.body, composition.body, walk);
      expect(pairs.every(({ element }) => element !== undefined)).toBe(true);
    }
  );
});

describe('slideRender output', () => {
  it('quotes a drawn slide and prints another surface’s output', () => {
    expect(runtime.surfaces.markdown.renderNode(example))
      .toMatchInlineSnapshot(`
      "_The delivery slide, from the svg surface · delivery-times · svg_

      > # Orders now arrive in under 30 minutes
      >
      > Routing from the nearest store cut the median wait by eleven minutes.
      >
      > _Basket · 02 Operations_"
    `);
    expect(runtime.surfaces.markdown.renderNode(markdownExample))
      .toMatchInlineSnapshot(`
      "_The delivery slide, as Markdown · markdown_

      \`\`\`
      # Orders now arrive in under 30 minutes
      Routing from the nearest store cut the median wait by eleven minutes.
      _Basket · 02 Operations_
      \`\`\`"
    `);
    expect(runtime.surfaces.text.renderNode(placeholderExample)).toBe(
      'The weekly summary, from the svg surface · weekly-summary · svg'
    );
  });

  it('keeps one Slack header, turning an embedded one into a bold section', () => {
    const blocks = runtime.surfaces.slack.render(compose(example)).blocks;
    expect(blocks.filter(({ type }) => type === 'header')).toHaveLength(1);
    expect(blocks).toContainEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Orders now arrive in under 30 minutes*' },
    });
  });
});

describe('slideRender JSX', () => {
  it('takes its body as a prop of elements', () => {
    const {
      Composition: View,
      SlideHeading,
      SlideRender,
      toComposition,
    } = slideJsx;
    const composition = toComposition(
      createElement(
        View,
        null,
        createElement(SlideRender, {
          surface: 'svg',
          body: [createElement(SlideHeading, { title: 'Embedded' })],
        })
      )
    );
    expect(composition.body[0]).toEqual({
      type: 'slideRender',
      surface: 'svg',
      body: [{ type: 'slideHeading', title: 'Embedded' }],
    });
  });
});
